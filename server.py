#!/usr/bin/env python3
"""AI 그룹웨어 공유 서버.

정적 파일을 제공하고, 브라우저 localStorage(ai-groupware-*) 값을 data/groupware.db(SQLite)에 보관해
여러 기기가 같은 데이터를 보도록 한다. 표준 라이브러리만 사용한다.

  python3 server.py                  # 0.0.0.0:8765
  GW_PORT=9000 python3 server.py
  GW_DATA_GO_KR_KEY=인증키 python3 server.py   # 공휴일·사업자 조회 (없으면 data/data-go-kr.key)

로그인: 아이디·비밀번호 계정(회원과 1:1)과 세션 쿠키를 사용한다. 처음 접속하면 login.html에서 마스터 계정을 만든다.
  GW_PASSWORD 또는 data/password 파일이 있으면 그 값이 '최초 설정 키'가 된다(없으면 누구나 최초 설정 가능).
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlencode, urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "groupware.db")
DATA_GO_KR_KEY_FILE = os.path.join(DATA_DIR, "data-go-kr.key")
HOLIDAY_DIR = os.path.join(DATA_DIR, "holidays")
LEGACY_JSON = os.path.join(DATA_DIR, "store.json")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
BACKUP_DAILY_DAYS = 90
KEY_PREFIX = "ai-groupware-"
MAX_BODY = 20 * 1024 * 1024
BLOCKED_PREFIXES = ("/data", "/server.py", "/deploy", "/.")
SESSION_COOKIE = "gw_session"
SESSION_DAYS = 30
PUBLIC_PATHS = ("/login.html", "/styles.css")
PUBLIC_PREFIXES = ("/fonts/",)
USERNAME_RE = re.compile(r"^[\w.\-@]{3,40}$")
MIN_PASSWORD = 8
INITIAL_PASSWORD = "1234"  # 가입 승인·비밀번호 초기화 때 정해지는 임시 비밀번호
PHONE_RE = re.compile(r"^[0-9+\-() ]{7,20}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_PENDING_SIGNUPS = 100
MAX_FAILS = 5
FAIL_WINDOW = 300
fails = {}  # ip -> [실패 시각]
signup_hits = {}  # ip -> [가입 요청 시각]
reset_hits = {}  # ip -> [비밀번호 초기화 요청 시각]
SIGNUPS_PER_HOUR = 5
RESET_REQUESTS_PER_HOUR = 10
BIZ_PER_MINUTE = 30
HOLIDAY_TTL = 7 * 86400
HOLIDAY_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
BIZ_URL = "https://api.odcloud.kr/api/nts-businessman/v1/status"
BIZ_NO_RE = re.compile(r"^\d{10}$")

lock = threading.Lock()
biz_hits = {}  # ip -> [조회 시각]
holiday_locks = {}


def data_go_kr_key():
    """공공데이터포털 인증키. 환경 변수가 있으면 파일보다 우선한다."""
    env = os.environ.get("GW_DATA_GO_KR_KEY", "").strip()
    if env:
        return env
    try:
        with open(DATA_GO_KR_KEY_FILE, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return ""


def key_from_env():
    return bool(os.environ.get("GW_DATA_GO_KR_KEY", "").strip())


def save_data_go_kr_key(key):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_GO_KR_KEY_FILE, "w", encoding="utf-8") as f:
        f.write(key.strip() + "\n")
    try:
        os.chmod(DATA_GO_KR_KEY_FILE, 0o600)
    except OSError:
        pass


def hide_key(text, key):
    if not text or not key:
        return text or ""
    hidden = text.replace(key, "***").replace(quote(key, safe=""), "***")
    return hidden[:300]


def key_variants(key):
    """인코딩된 키와 디코딩된 키를 중복 없이 돌려준다."""
    opts = []
    if "%" in key:
        opts.append(key)
        plain = unquote(key)
        if plain != key:
            opts.append(quote(plain, safe=""))
    else:
        opts.append(quote(key, safe=""))
    out = []
    for item in opts:
        if item and item not in out:
            out.append(item)
    return out


def http_json(url, method="GET", payload=None, timeout=12):
    data = None
    headers = {"Accept": "application/json", "User-Agent": "ai-groupware"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        if raw.lstrip().startswith("<"):
            raise RuntimeError("외부 API 오류 (%s)" % exc.code)
        try:
            parsed = json.loads(raw)
        except ValueError:
            raise RuntimeError("외부 API 오류 (%s)" % exc.code)
        if isinstance(parsed, dict):
            raise RuntimeError(str(parsed.get("msg") or parsed.get("message") or "외부 API 오류"))
        raise RuntimeError("외부 API 오류 (%s)" % exc.code)
    if raw.lstrip().startswith("<"):
        raise RuntimeError("외부 API가 JSON 대신 XML을 반환했습니다. 인증키(디코딩 키)와 API 활용 신청을 확인하세요.")
    return json.loads(raw)


def parse_holiday_items(body):
    """특일 정보 응답에서 공휴일(날짜, 이름) 목록을 뽑는다. 결과 코드가 00이 아니면 예외."""
    response = body.get("response") if isinstance(body, dict) else None
    header = (response or {}).get("header") or {}
    code = str(header.get("resultCode") or "")
    if code != "00":
        raise RuntimeError("%s %s" % (code or "??", header.get("resultMsg") or "공휴일 조회 실패"))
    items = ((response or {}).get("body") or {}).get("items") or {}
    item = items.get("item") if isinstance(items, dict) else None
    if not item:
        return []
    if isinstance(item, dict):
        item = [item]
    found = []
    for it in item:
        if str(it.get("isHoliday") or "Y") != "Y":
            continue
        loc = str(it.get("locdate") or "")
        if len(loc) == 8 and loc.isdigit():
            found.append(("%s-%s-%s" % (loc[:4], loc[4:6], loc[6:8]), str(it.get("dateName") or "공휴일")))
    return found


def fetch_holiday_month(year, month, key_token):
    query = "serviceKey=" + key_token + "&" + urlencode({
        "solYear": str(year),
        "solMonth": "%02d" % month,
        "numOfRows": "30",
        "_type": "json",
    })
    return parse_holiday_items(http_json(HOLIDAY_URL + "?" + query))


def fetch_holiday_year(year, key):
    variants = key_variants(key)
    chosen = variants[0]
    try:
        fetch_holiday_month(year, 1, chosen)
    except RuntimeError as exc:
        if len(variants) > 1 and ("30" in str(exc) or "SERVICE_KEY" in str(exc)):
            chosen = variants[1]
        else:
            raise
    days = {}

    def one(month):
        return fetch_holiday_month(year, month, chosen)

    with ThreadPoolExecutor(max_workers=4) as pool:
        for found in pool.map(one, range(1, 13)):
            for iso, name in found:
                if iso in days and name not in days[iso].split("·"):
                    days[iso] = days[iso] + "·" + name
                else:
                    days.setdefault(iso, name)
    return [{"date": iso, "name": days[iso]} for iso in sorted(days)]


def read_holiday_cache(year):
    path = os.path.join(HOLIDAY_DIR, "%d.json" % year)
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or not isinstance(data.get("days"), list):
        return None
    return data


def holiday_year(year, key):
    """(days, error). 캐시가 신선하면 API를 호출하지 않는다."""
    with lock:
        if year not in holiday_locks:
            holiday_locks[year] = threading.Lock()
        year_lock = holiday_locks[year]
    with year_lock:
        cached = read_holiday_cache(year)
        if cached and time.time() - float(cached.get("fetched") or 0) < float(cached.get("ttl") or HOLIDAY_TTL):
            return cached["days"], ""
        if not key:
            return (cached["days"] if cached else []), ""
        try:
            days = fetch_holiday_year(year, key)
        except Exception as exc:
            if cached:
                return cached["days"], "공휴일 갱신에 실패해 저장된 목록을 사용합니다."
            return [], hide_key(str(exc), key)
        ttl = HOLIDAY_TTL if len(days) >= 8 else 86400
        os.makedirs(HOLIDAY_DIR, exist_ok=True)
        with open(os.path.join(HOLIDAY_DIR, "%d.json" % year), "w", encoding="utf-8") as f:
            json.dump({"fetched": time.time(), "ttl": ttl, "days": days}, f, ensure_ascii=False)
        return days, ""


def format_ymd(value):
    text = str(value or "")
    if len(text) == 8 and text.isdigit():
        return "%s-%s-%s" % (text[:4], text[4:6], text[6:8])
    return text


def lookup_business(b_no, key):
    last = None
    for token in key_variants(key):
        try:
            body = http_json(BIZ_URL + "?serviceKey=" + token, "POST", {"b_no": [b_no]})
        except Exception as exc:
            last = exc
            continue
        if not isinstance(body, dict) or "data" not in body:
            last = RuntimeError(str((body or {}).get("msg") or (body or {}).get("message") or "사업자 조회에 실패했습니다.") if isinstance(body, dict) else "사업자 조회에 실패했습니다.")
            continue
        row = (body.get("data") or [None])[0] or {}
        return {
            "b_no": row.get("b_no") or b_no,
            "statusCode": row.get("b_stt_cd") or "",
            "status": row.get("b_stt") or "",
            "taxType": row.get("tax_type") or "",
            "taxTypeCode": row.get("tax_type_cd") or "",
            "endDate": format_ymd(row.get("end_dt")),
        }
    raise RuntimeError(hide_key(str(last or "사업자 조회에 실패했습니다."), key))


def biz_rate_limited(ip):
    now = time.time()
    biz_hits[ip] = [t for t in biz_hits.get(ip, []) if now - t < 60]
    if len(biz_hits[ip]) >= BIZ_PER_MINUTE:
        return True
    biz_hits[ip].append(now)
    return False


def connect():
    os.makedirs(DATA_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH, timeout=10)


def init_db():
    """테이블을 만들고, DB가 비어 있으면 예전 data/store.json 내용을 한 번 옮겨 담는다."""
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, v INTEGER NOT NULL, value TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS users (member_id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, "
                   "salt BLOB NOT NULL, hash BLOB NOT NULL)")
        # must_change=1: 초기 비밀번호 상태. 이 비밀번호로는 로그인되지 않고 새 비밀번호를 설정해야 한다
        if "must_change" not in [c[1] for c in db.execute("PRAGMA table_info(users)")]:
            db.execute("ALTER TABLE users ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0")
        # 이전 방식(비밀번호 미설정, 빈 해시)으로 만든 계정은 초기 비밀번호 상태로 바꾼다
        for (member_id,) in db.execute("SELECT member_id FROM users WHERE length(hash) = 0").fetchall():
            salt = secrets.token_bytes(16)
            db.execute("UPDATE users SET salt = ?, hash = ?, must_change = 1 WHERE member_id = ?",
                       (salt, hash_password(INITIAL_PASSWORD, salt), member_id))
        db.execute("CREATE TABLE IF NOT EXISTS reset_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT NOT NULL, "
                   "created REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending')")
        db.execute("CREATE TABLE IF NOT EXISTS signups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, "
                   "email TEXT NOT NULL, created REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending')")
        if "username" not in [c[1] for c in db.execute("PRAGMA table_info(signups)")]:
            db.execute("ALTER TABLE signups ADD COLUMN username TEXT NOT NULL DEFAULT ''")
        db.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, member_id TEXT NOT NULL, expires REAL NOT NULL)")
        empty = db.execute("SELECT COUNT(*) FROM kv").fetchone()[0] == 0
        if empty and os.path.exists(LEGACY_JSON):
            with open(LEGACY_JSON, encoding="utf-8") as f:
                legacy = json.load(f)
            db.executemany("INSERT INTO kv (key, v, value) VALUES (?, ?, ?)",
                           [(k, e["v"], e["value"]) for k, e in legacy.items()])
            print("store.json -> %s: %d개 항목을 옮겼습니다" % (os.path.basename(DB_PATH), len(legacy)), flush=True)


def load_store():
    with connect() as db:
        return {k: {"v": v, "value": value} for k, v, value in db.execute("SELECT key, v, value FROM kv")}


def get_entry(key):
    with connect() as db:
        row = db.execute("SELECT v, value FROM kv WHERE key = ?", (key,)).fetchone()
    return {"v": row[0], "value": row[1]} if row else None


def put_entry(key, entry):
    backup_today()
    with connect() as db:
        db.execute("INSERT INTO kv (key, v, value) VALUES (?, ?, ?) "
                   "ON CONFLICT(key) DO UPDATE SET v = excluded.v, value = excluded.value",
                   (key, entry["v"], entry["value"]))


def delete_entry(key):
    backup_today()
    with connect() as db:
        db.execute("DELETE FROM kv WHERE key = ?", (key,))


def backup_today():
    """하루 첫 저장 직전에 전날까지의 상태를 보관한다."""
    if not os.path.exists(DB_PATH):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    target = os.path.join(BACKUP_DIR, "groupware-%s.db" % date.today().isoformat())
    if os.path.exists(target):
        return
    src = connect()
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    prune_backups()


def prune_backups():
    """최근 BACKUP_DAILY_DAYS일은 매일, 그 이전은 달마다 가장 이른 백업 하나만 영구 보관한다."""
    cutoff = (date.today() - timedelta(days=BACKUP_DAILY_DAYS)).isoformat()
    kept_months = set()
    for name in sorted(f for f in os.listdir(BACKUP_DIR) if f.startswith("groupware-") and f.endswith(".db")):
        day = name[len("groupware-"):-len(".db")]
        if day >= cutoff:
            continue
        month = day[:7]
        if month in kept_months:
            os.remove(os.path.join(BACKUP_DIR, name))
        else:
            kept_months.add(month)


# ---------- 계정 · 세션 ----------
def hash_password(password, salt):
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)


def has_users():
    with connect() as db:
        return db.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0


def find_user(username):
    """(member_id, username, salt, hash, must_change) 또는 None"""
    with connect() as db:
        return db.execute("SELECT member_id, username, salt, hash, must_change FROM users WHERE username = ?", (username,)).fetchone()


def digits(phone):
    return re.sub(r"\D", "", phone or "")


def set_user(member_id, username, password=None):
    """계정을 만들거나 바꾼다. password가 있으면 본인이 정한 비밀번호로 저장하고,
    없으면 아이디만 바꾼다(새 계정이면 초기 비밀번호로 만든다). 오류 메시지 또는 None을 돌려준다."""
    with connect() as db:
        dup = db.execute("SELECT member_id FROM users WHERE username = ?", (username,)).fetchone()
        if dup and dup[0] != member_id:
            return "이미 사용 중인 아이디입니다."
        row = db.execute("SELECT 1 FROM users WHERE member_id = ?", (member_id,)).fetchone()
        if row is None:
            initial = password is None
            salt = secrets.token_bytes(16)
            db.execute("INSERT INTO users (member_id, username, salt, hash, must_change) VALUES (?, ?, ?, ?, ?)",
                       (member_id, username, salt, hash_password(INITIAL_PASSWORD if initial else password, salt), 1 if initial else 0))
            return None
        db.execute("UPDATE users SET username = ? WHERE member_id = ?", (username, member_id))
        if password is not None:
            salt = secrets.token_bytes(16)
            db.execute("UPDATE users SET salt = ?, hash = ?, must_change = 0 WHERE member_id = ?",
                       (salt, hash_password(password, salt), member_id))
    return None


def reset_password(member_id):
    """비밀번호를 초기 비밀번호로 되돌린다. 본인이 로그인해서 새 비밀번호를 설정해야 한다."""
    with connect() as db:
        salt = secrets.token_bytes(16)
        db.execute("UPDATE users SET salt = ?, hash = ?, must_change = 1 WHERE member_id = ?",
                   (salt, hash_password(INITIAL_PASSWORD, salt), member_id))
        db.execute("DELETE FROM sessions WHERE member_id = ?", (member_id,))


def delete_user(member_id):
    with connect() as db:
        db.execute("DELETE FROM users WHERE member_id = ?", (member_id,))
        db.execute("DELETE FROM sessions WHERE member_id = ?", (member_id,))


def all_accounts():
    """회원 id -> {아이디, 초기 비밀번호 상태 여부}. 비밀번호 값은 어디에도 내보내지 않는다."""
    with connect() as db:
        return {m: {"username": u, "mustChange": bool(c)}
                for m, u, c in db.execute("SELECT member_id, username, must_change FROM users")}


def all_usernames():
    return {m: a["username"] for m, a in all_accounts().items()}


def verify(user, password):
    return user is not None and hmac.compare_digest(hash_password(password, user[2]), user[3])


# ---------- 가입 요청 ----------
def add_signup(name, phone, email, username):
    with connect() as db:
        db.execute("INSERT INTO signups (name, phone, email, created, username) VALUES (?, ?, ?, ?, ?)",
                   (name, phone, email, time.time(), username))


def pending_signups():
    with connect() as db:
        rows = db.execute("SELECT id, name, phone, email, created, username FROM signups WHERE status = 'pending' ORDER BY id").fetchall()
    return [{"id": r[0], "name": r[1], "phone": r[2], "email": r[3], "created": r[4], "username": r[5]} for r in rows]


def get_signup(signup_id):
    with connect() as db:
        return db.execute("SELECT id, name, phone, email, username FROM signups WHERE id = ? AND status = 'pending'", (signup_id,)).fetchone()


def finish_signup(signup_id, status):
    with connect() as db:
        db.execute("UPDATE signups SET status = ? WHERE id = ?", (status, signup_id))


# ---------- 비밀번호 초기화 요청 ----------
def add_reset_request(member_id):
    with connect() as db:
        if db.execute("SELECT 1 FROM reset_requests WHERE member_id = ? AND status = 'pending'", (member_id,)).fetchone():
            return
        db.execute("INSERT INTO reset_requests (member_id, created) VALUES (?, ?)", (member_id, time.time()))


def pending_resets():
    with connect() as db:
        rows = db.execute("SELECT r.id, r.member_id, r.created, u.username FROM reset_requests r "
                          "JOIN users u ON u.member_id = r.member_id WHERE r.status = 'pending' ORDER BY r.id").fetchall()
    out = []
    for rid, member_id, created, username in rows:
        member = member_of(member_id)
        if member and member.get("active") is not False:
            out.append({"id": rid, "memberId": member_id, "name": member.get("name", ""), "username": username,
                        "role": member.get("role"), "created": created})
    return out


def get_reset(reset_id):
    with connect() as db:
        return db.execute("SELECT id, member_id FROM reset_requests WHERE id = ? AND status = 'pending'", (reset_id,)).fetchone()


def finish_reset(reset_id, status):
    with connect() as db:
        db.execute("UPDATE reset_requests SET status = ? WHERE id = ?", (status, reset_id))


def can_manage(me, target):
    """마스터는 모든 회원, 관리자는 일반 회원의 계정만 관리한다."""
    return bool(me and target) and (me.get("role") == "master" or (me.get("role") == "admin" and target.get("role") == "member"))


def create_session(member_id):
    token = secrets.token_urlsafe(32)
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE expires < ?", (time.time(),))
        db.execute("INSERT INTO sessions (token, member_id, expires) VALUES (?, ?, ?)",
                   (token, member_id, time.time() + SESSION_DAYS * 86400))
    return token


def drop_sessions(member_id, keep=None):
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE member_id = ? AND token IS NOT ?", (member_id, keep))


def drop_session(token):
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))


def members_list():
    entry = get_entry(KEY_PREFIX + "members")
    try:
        return json.loads(entry["value"]) if entry else []
    except ValueError:
        return []


def member_of(member_id):
    for m in members_list():
        if m.get("id") == member_id:
            return m
    return None


def setup_key():
    pw = os.environ.get("GW_PASSWORD")
    if pw:
        return pw
    path = os.path.join(DATA_DIR, "password")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read().strip() or None
    return None


def master_member_id():
    for m in members_list():
        if m.get("role") == "master" and m.get("active") is not False:
            return m["id"]
    return None


# 쓰기 권한이 필요한 데이터: 회원 목록은 마스터·관리자, 메뉴 권한·순서는 마스터, 회원정보(연락처)는 본인
MASTER_ONLY_KEYS = (KEY_PREFIX + "menu-permissions", KEY_PREFIX + "menu-order")
MEMBERS_KEY = KEY_PREFIX + "members"
PROFILE_PREFIX = KEY_PREFIX + "profile-"


def may_write(member_id, key, value):
    """이 회원이 해당 키를 value로 바꿔도 되는지 (value는 삭제 시 None)."""
    if key.startswith(PROFILE_PREFIX):
        return key == PROFILE_PREFIX + member_id  # 회원정보는 본인 것만
    me = member_of(member_id) or {}
    role = me.get("role")
    if key in MASTER_ONLY_KEYS:
        return role == "master"
    if key != MEMBERS_KEY or role in ("master", "admin"):
        return True
    return False  # 일반 회원은 이름·아이디·직급 등 회원 정보를 바꿀 수 없다 (연락처는 profile-<id> 키)


def rate_limited(ip):
    now = time.time()
    fails[ip] = [t for t in fails.get(ip, []) if now - t < FAIL_WINDOW]
    return len(fails[ip]) >= MAX_FAILS


def check_credentials(username, password):
    """(오류 메시지 | None). 아이디 형식과 비밀번호 길이를 검사한다."""
    if not USERNAME_RE.match(username or ""):
        return "아이디는 3~40자의 글자·숫자와 . _ - @ 만 쓸 수 있습니다."
    if password is not None and len(password) < MIN_PASSWORD:
        return "비밀번호는 %d자 이상이어야 합니다." % MIN_PASSWORD
    return None


init_db()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    # ---------- 인증 ----------
    def token(self):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        return cookie[SESSION_COOKIE].value if SESSION_COOKIE in cookie else None

    def current_member_id(self):
        """유효한 세션의 회원 id (비활성·삭제된 회원이면 None)."""
        token = self.token()
        if not token:
            return None
        with connect() as db:
            row = db.execute("SELECT member_id FROM sessions WHERE token = ? AND expires > ?", (token, time.time())).fetchone()
        if not row:
            return None
        member = member_of(row[0])
        if member is None or member.get("active") is False:
            return None
        return row[0]

    def is_public(self, path):
        return path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES)

    def require_login(self):
        """로그인된 회원 id를 돌려준다. 아니면 응답을 보내고 None."""
        member_id = self.current_member_id()
        if member_id:
            return member_id
        path = urlsplit(self.path).path
        if path.endswith(".html") or path.endswith("/"):
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/login.html?next=" + quote(self.path))
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "로그인이 필요합니다."})
        return None

    def set_cookie(self, token, max_age):
        self.send_header("Set-Cookie", "%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d" % (SESSION_COOKIE, token, max_age))

    def send_json(self, status, payload, token=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if token is not None:
            self.set_cookie(token, SESSION_DAYS * 86400 if token else 0)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 64 * 1024:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except ValueError:
            return {}
        return data if isinstance(data, dict) else {}

    def store_key(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/store/"):
            return None
        key = unquote(path[len("/api/store/"):])
        return key if key.startswith(KEY_PREFIX) else None

    @staticmethod
    def blocked(path):
        path = os.path.normpath(unquote(path)).replace("\\", "/")
        if path.startswith("/."):
            return True
        return any(path == p or path.startswith(p + "/") for p in BLOCKED_PREFIXES if p != "/.")

    def holiday_span(self):
        qs = parse_qs(urlsplit(self.path).query)
        this_year = date.today().year
        try:
            start = int((qs.get("from") or [str(this_year)])[0])
            end = int((qs.get("to") or [str(start)])[0])
        except ValueError:
            start = end = this_year
        start = max(2000, min(2100, start))
        end = max(2000, min(2100, end))
        if end < start:
            start, end = end, start
        if end - start > 2:
            end = start + 2
        return range(start, end + 1)

    def send_holidays(self):
        key = data_go_kr_key()
        days = []
        errors = []
        for year in self.holiday_span():
            found, error = holiday_year(year, key)
            days.extend(found)
            if error and error not in errors:
                errors.append(error)
        self.send_json(HTTPStatus.OK, {
            "configured": bool(key),
            "days": days,
            "error": errors[0] if errors else "",
        })

    def send_integration_status(self, member_id):
        me = member_of(member_id) or {}
        key = data_go_kr_key()
        payload = {"configured": bool(key), "fromEnv": key_from_env()}
        if me.get("role") == "master" and key and not key_from_env():
            payload["hint"] = key[:4] + "…" + key[-4:] if len(key) > 12 else "설정됨"
        self.send_json(HTTPStatus.OK, payload)

    def handle_integration_key(self, body, member_id):
        me = member_of(member_id) or {}
        if me.get("role") != "master":
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "인증키는 마스터만 저장할 수 있습니다."})
        if key_from_env():
            return self.send_json(HTTPStatus.CONFLICT, {"error": "환경 변수 GW_DATA_GO_KR_KEY가 설정되어 있어 화면에서 바꿀 수 없습니다."})
        key = str(body.get("key") or "").strip()
        if len(key) < 10 or len(key) > 400 or any(ch.isspace() for ch in key):
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "인증키 형식이 올바르지 않습니다."})
        save_data_go_kr_key(key)
        self.send_json(HTTPStatus.OK, {"ok": True, "configured": True})

    def handle_business(self, body, ip):
        if biz_rate_limited(ip):
            return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "조회가 너무 많습니다. 잠시 후 다시 해 주세요."})
        key = data_go_kr_key()
        if not key:
            return self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                "configured": False,
                "error": "공공데이터포털 인증키가 없습니다.",
            })
        b_no = re.sub(r"\D", "", str(body.get("b_no") or ""))
        if not BIZ_NO_RE.match(b_no):
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "사업자등록번호 10자리를 입력하세요."})
        try:
            found = lookup_business(b_no, key)
        except Exception as exc:
            return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": hide_key(str(exc), key) or "사업자 조회에 실패했습니다."})
        self.send_json(HTTPStatus.OK, found)

    # ---------- GET / HEAD ----------
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/status":
            return self.send_json(HTTPStatus.OK, {"setup": not has_users(), "keyRequired": bool(setup_key())})
        if self.blocked(path):
            return self.send_error(HTTPStatus.NOT_FOUND)
        if not self.is_public(path):
            member_id = self.require_login()
            if member_id is None:
                return
            if path == "/api/me":
                return self.send_json(HTTPStatus.OK, {"memberId": member_id, "username": all_usernames().get(member_id, "")})
            if path == "/api/store":
                return self.send_json(HTTPStatus.OK, load_store())
            if path == "/api/accounts":
                me = member_of(member_id)
                if me.get("role") not in ("master", "admin"):
                    return self.send_json(HTTPStatus.FORBIDDEN, {"error": "권한이 없습니다."})
                return self.send_json(HTTPStatus.OK, all_accounts())
            if path == "/api/reset-requests":
                me = member_of(member_id)
                if (me or {}).get("role") not in ("master", "admin"):
                    return self.send_json(HTTPStatus.FORBIDDEN, {"error": "권한이 없습니다."})
                return self.send_json(HTTPStatus.OK, [r for r in pending_resets() if can_manage(me, {"role": r["role"]}) and r["memberId"] != member_id])
            if path == "/api/signups":
                if (member_of(member_id) or {}).get("role") not in ("master", "admin"):
                    return self.send_json(HTTPStatus.FORBIDDEN, {"error": "권한이 없습니다."})
                return self.send_json(HTTPStatus.OK, pending_signups())
            if path == "/api/holidays":
                return self.send_holidays()
            if path == "/api/integrations":
                return self.send_integration_status(member_id)
        return super().do_GET()

    def do_HEAD(self):
        path = urlsplit(self.path).path
        if self.blocked(path):
            return self.send_error(HTTPStatus.NOT_FOUND)
        if not self.is_public(path) and self.require_login() is None:
            return
        super().do_HEAD()

    # ---------- POST: 로그인 · 로그아웃 · 최초 설정 ----------
    def do_POST(self):
        path = urlsplit(self.path).path
        ip = self.client_address[0]
        body = self.read_json()
        if path == "/api/business/status":
            if self.require_login() is None:
                return
            return self.handle_business(body, ip)
        if path == "/api/integrations/key":
            member_id = self.require_login()
            if member_id is None:
                return
            return self.handle_integration_key(body, member_id)
        if path == "/api/login":
            if rate_limited(ip):
                return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "시도가 너무 많습니다. 잠시 후 다시 해 주세요."})
            user = find_user(str(body.get("username", "")).strip())
            password = str(body.get("password", ""))
            member = member_of(user[0]) if user else None
            if user is None:
                hash_password(password, b"\0" * 16)  # 아이디 존재 여부가 응답 시간으로 드러나지 않게
            ok = verify(user, password)
            if not ok or member is None or member.get("active") is False:
                fails.setdefault(ip, []).append(time.time())
                return self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "아이디 또는 비밀번호가 맞지 않습니다."})
            fails.pop(ip, None)  # 맞게 입력하면 실패 횟수를 지운다
            if user[4]:
                # 초기 비밀번호로 로그인한 경우: 로그인시키지 않고 새 비밀번호 설정 화면으로 보낸다
                return self.send_json(HTTPStatus.OK, {"mustChange": True})
            return self.send_json(HTTPStatus.OK, {"ok": True}, create_session(user[0]))
        if path == "/api/setup":
            if has_users():
                return self.send_json(HTTPStatus.CONFLICT, {"error": "이미 설정되었습니다."})
            if rate_limited(ip):
                return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "시도가 너무 많습니다. 잠시 후 다시 해 주세요."})
            key = setup_key()
            if key and not hmac.compare_digest(str(body.get("key", "")).encode(), key.encode()):
                fails.setdefault(ip, []).append(time.time())
                return self.send_json(HTTPStatus.FORBIDDEN, {"error": "설정 키가 맞지 않습니다."})
            username, password = str(body.get("username", "")).strip(), str(body.get("password", ""))
            error = check_credentials(username, password)
            if error:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            with lock:
                member_id = master_member_id()
                if member_id is None and get_entry(KEY_PREFIX + "members") is None:
                    # 데이터가 전혀 없는 새 설치: 설정하는 사람이 첫 마스터 회원이 된다
                    member_id = "m-" + secrets.token_hex(4)
                    first = [{"id": member_id, "name": username, "title": "", "role": "master", "active": True,
                              "createdAt": int(time.time() * 1000)}]
                    put_entry(KEY_PREFIX + "members", {"v": 1, "value": json.dumps(first, ensure_ascii=False)})
                if member_id is None:
                    return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "활성 마스터 회원이 없습니다. 데이터를 확인해 주세요."})
                error = set_user(member_id, username, password)
            if error:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            return self.send_json(HTTPStatus.OK, {"ok": True}, create_session(member_id))
        if path == "/api/signup":
            now = time.time()
            signup_hits[ip] = [t for t in signup_hits.get(ip, []) if now - t < 3600]
            if len(signup_hits[ip]) >= SIGNUPS_PER_HOUR:
                return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "요청이 너무 많습니다. 잠시 후 다시 해 주세요."})
            name = str(body.get("name", "")).strip()
            phone = str(body.get("phone", "")).strip()
            email = str(body.get("email", "")).strip()
            username = str(body.get("username", "")).strip()
            error = None
            if not 1 <= len(name) <= 20:
                error = "이름을 1~20자로 입력해 주세요."
            elif not PHONE_RE.match(phone) or len(digits(phone)) < 8:
                error = "전화번호를 올바르게 입력해 주세요."
            elif not EMAIL_RE.match(email) or len(email) > 80:
                error = "이메일 형식이 올바르지 않습니다."
            elif check_credentials(username, None):
                error = check_credentials(username, None)
            elif find_user(username) or any(r["username"].lower() == username.lower() for r in pending_signups()):
                error = "이미 사용 중이거나 요청된 아이디입니다. 다른 아이디를 입력해 주세요."
            elif len(pending_signups()) >= MAX_PENDING_SIGNUPS:
                error = "가입 요청이 너무 많이 쌓여 있습니다. 관리자에게 문의해 주세요."
            elif any(digits(r["phone"]) == digits(phone) for r in pending_signups()):
                error = "이미 같은 전화번호로 요청되어 있습니다. 관리자의 승인을 기다려 주세요."
            if error:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            signup_hits[ip].append(now)
            add_signup(name, phone, email, username)
            return self.send_json(HTTPStatus.OK, {"ok": True})
        if path == "/api/create-password":
            # 초기 비밀번호(1234)를 아는 본인이 새 비밀번호를 정한다
            if rate_limited(ip):
                return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "시도가 너무 많습니다. 잠시 후 다시 해 주세요."})
            user = find_user(str(body.get("username", "")).strip())
            member = member_of(user[0]) if user else None
            if user is None:
                hash_password("x", b"\0" * 16)
            if user is None or not user[4] or not verify(user, str(body.get("current", ""))) or member is None or member.get("active") is False:
                fails.setdefault(ip, []).append(time.time())
                return self.send_json(HTTPStatus.FORBIDDEN, {"error": "초기 비밀번호가 맞지 않거나, 이미 비밀번호가 설정되어 있습니다."})
            password = str(body.get("password", ""))
            error = check_credentials(user[1], password)
            if not error and password == INITIAL_PASSWORD:
                error = "초기 비밀번호와 다른 비밀번호를 입력해 주세요."
            if error:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            with lock:
                set_user(user[0], user[1], password)
            return self.send_json(HTTPStatus.OK, {"ok": True}, create_session(user[0]))
        if path == "/api/reset-request":
            # 이름과 아이디가 모두 맞는 계정만 접수하되, 맞는지 여부는 응답으로 알려 주지 않는다(계정 존재 여부 노출 방지)
            now = time.time()
            reset_hits[ip] = [t for t in reset_hits.get(ip, []) if now - t < 3600]
            if len(reset_hits[ip]) >= RESET_REQUESTS_PER_HOUR:
                return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {"error": "요청이 너무 많습니다. 잠시 후 다시 해 주세요."})
            name = str(body.get("name", "")).strip()
            username = str(body.get("username", "")).strip()
            if not name or not username:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "이름과 아이디를 입력해 주세요."})
            reset_hits[ip].append(now)
            user = find_user(username)
            member = member_of(user[0]) if user else None
            if member and member.get("active") is not False and member.get("name") == name:
                add_reset_request(user[0])
            return self.send_json(HTTPStatus.OK, {"ok": True})
        if path.startswith("/api/reset-requests/"):
            return self.handle_reset_action(path)
        if path.startswith("/api/signups/"):
            return self.handle_signup_action(path, body)
        if path.startswith("/api/accounts/") and path.endswith("/reset"):
            found = self.account_target()
            if not found:
                return
            me, target_id = found
            if target_id == self.current_member_id():
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "본인 비밀번호는 내 계정 메뉴의 '비밀번호 변경'으로 바꿔 주세요."})
            account = all_accounts().get(target_id)
            if not account:
                return self.send_json(HTTPStatus.NOT_FOUND, {"error": "로그인 계정이 없습니다."})
            with lock:
                reset_password(target_id)
            return self.send_json(HTTPStatus.OK, {"ok": True})
        if path == "/api/logout":
            if self.token():
                drop_session(self.token())
            return self.send_json(HTTPStatus.OK, {"ok": True}, "")
        if path == "/api/password":
            member_id = self.require_login()
            if member_id is None:
                return
            user = find_user(all_usernames().get(member_id, ""))
            if rate_limited(ip) or not verify(user, str(body.get("current", ""))):
                fails.setdefault(ip, []).append(time.time())
                return self.send_json(HTTPStatus.FORBIDDEN, {"error": "현재 비밀번호가 맞지 않습니다."})
            new = str(body.get("password", ""))
            error = check_credentials(user[1], new)
            if error:
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            with lock:
                set_user(member_id, user[1], new)
                drop_sessions(member_id, keep=self.token())
            return self.send_json(HTTPStatus.OK, {"ok": True})
        self.send_error(HTTPStatus.NOT_FOUND)

    # ---------- 계정 관리 (마스터·관리자) ----------
    def account_target(self):
        """(요청자 회원, 대상 회원 id) 또는 응답을 보내고 None."""
        member_id = self.require_login()
        if member_id is None:
            return None
        path = urlsplit(self.path).path
        if not path.startswith("/api/accounts/"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return None
        target_id = unquote(path[len("/api/accounts/"):])
        if target_id.endswith("/reset"):
            target_id = target_id[:-len("/reset")]
        me, target = member_of(member_id), member_of(target_id)
        if target is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "회원을 찾을 수 없습니다."})
            return None
        # 마스터는 모두, 관리자는 일반 회원만 (본인 계정은 /api/password · 아래 아이디 변경만)
        allowed = me.get("role") == "master" or (me.get("role") == "admin" and target.get("role") == "member")
        if not allowed:
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "이 회원의 계정을 관리할 권한이 없습니다."})
            return None
        return me, target_id

    def do_PATCH(self):
        found = self.account_target()
        if not found:
            return
        _, target_id = found
        body = self.read_json()
        username = str(body.get("username", "")).strip()
        error = check_credentials(username, None)
        if error:
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
        with lock:
            error = set_user(target_id, username)
        if error:
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_reset_action(self, path):
        """POST /api/reset-requests/<id>/approve | reject  (마스터·관리자) — 승인하면 초기 비밀번호(1234)로 되돌린다"""
        member_id = self.require_login()
        if member_id is None:
            return
        me = member_of(member_id)
        if (me or {}).get("role") not in ("master", "admin"):
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "권한이 없습니다."})
        parts = path.split("/")  # ['', 'api', 'reset-requests', '<id>', 'approve']
        if len(parts) != 5 or not parts[3].isdigit() or parts[4] not in ("approve", "reject"):
            return self.send_error(HTTPStatus.NOT_FOUND)
        req = get_reset(int(parts[3]))
        if req is None:
            return self.send_json(HTTPStatus.NOT_FOUND, {"error": "이미 처리되었거나 없는 요청입니다."})
        if req[1] == member_id or not can_manage(me, member_of(req[1])):
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "이 회원의 비밀번호를 초기화할 권한이 없습니다."})
        with lock:
            if parts[4] == "approve":
                reset_password(req[1])
            finish_reset(req[0], "approved" if parts[4] == "approve" else "rejected")
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_signup_action(self, path, body):
        """POST /api/signups/<id>/approve | reject  (마스터·관리자)"""
        member_id = self.require_login()
        if member_id is None:
            return
        if (member_of(member_id) or {}).get("role") not in ("master", "admin"):
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "권한이 없습니다."})
        parts = path.split("/")  # ['', 'api', 'signups', '<id>', 'approve']
        if len(parts) != 5 or not parts[3].isdigit() or parts[4] not in ("approve", "reject"):
            return self.send_error(HTTPStatus.NOT_FOUND)
        req = get_signup(int(parts[3]))
        if req is None:
            return self.send_json(HTTPStatus.NOT_FOUND, {"error": "이미 처리되었거나 없는 요청입니다."})
        if parts[4] == "reject":
            finish_signup(req[0], "rejected")
            return self.send_json(HTTPStatus.OK, {"ok": True})
        name = str(body.get("name") or req[1]).strip()
        title = str(body.get("title", "")).strip()[:20]
        username = str(body.get("username") or req[4] or "").strip()
        error = check_credentials(username, None)
        if not error and not 1 <= len(name) <= 20:
            error = "이름을 1~20자로 입력해 주세요."
        if error:
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": error})
        with lock:
            members = members_list()
            if any(m.get("name") == name for m in members):
                return self.send_json(HTTPStatus.CONFLICT, {"error": "같은 이름의 회원이 이미 있습니다. 이름을 구분해서 입력해 주세요."})
            if find_user(username):
                return self.send_json(HTTPStatus.CONFLICT, {"error": "이미 사용 중인 아이디입니다."})
            new_id = "m-" + secrets.token_hex(4)
            members.append({"id": new_id, "name": name, "title": title, "role": "member", "active": True,
                            "createdAt": int(time.time() * 1000)})
            current = get_entry(MEMBERS_KEY)
            put_entry(MEMBERS_KEY, {"v": (current["v"] if current else 0) + 1, "value": json.dumps(members, ensure_ascii=False)})
            put_entry(PROFILE_PREFIX + new_id, {"v": 1, "value": json.dumps(
                {"phone": req[2], "email": req[3], "address": "", "emergency": "", "updatedAt": int(time.time() * 1000)}, ensure_ascii=False)})
            set_user(new_id, username)
            finish_signup(req[0], "approved")
        self.send_json(HTTPStatus.OK, {"ok": True, "memberId": new_id})

    def do_PUT(self):
        key = self.store_key()
        if key is None:
            return self.send_error(HTTPStatus.NOT_FOUND)
        member_id = self.require_login()
        if member_id is None:
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        value = self.rfile.read(length).decode("utf-8")
        if not may_write(member_id, key, value):
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "이 정보를 수정할 권한이 없습니다."})
        base = self.headers.get("X-Base-Version")
        with lock:
            current = get_entry(key)
            current_v = current["v"] if current else 0
            if base is not None and base != "" and int(base) != current_v:
                return self.send_json(HTTPStatus.CONFLICT, {"key": key, "entry": current})
            entry = {"v": current_v + 1, "value": value}
            put_entry(key, entry)
        self.send_json(HTTPStatus.OK, entry)

    def do_DELETE(self):
        path = urlsplit(self.path).path
        if path.startswith("/api/accounts/"):
            found = self.account_target()
            if not found:
                return
            me, target_id = found
            if target_id == self.current_member_id():
                return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "본인 계정은 삭제할 수 없습니다."})
            with lock:
                delete_user(target_id)
            return self.send_json(HTTPStatus.OK, {"ok": True})
        key = self.store_key()
        if key is None:
            return self.send_error(HTTPStatus.NOT_FOUND)
        member_id = self.require_login()
        if member_id is None:
            return
        if (key in MASTER_ONLY_KEYS + (MEMBERS_KEY,) or key.startswith(PROFILE_PREFIX)) and not may_write(member_id, key, None):
            return self.send_json(HTTPStatus.FORBIDDEN, {"error": "이 정보를 삭제할 권한이 없습니다."})
        with lock:
            delete_entry(key)
        self.send_json(HTTPStatus.OK, {"ok": True})


def main():
    port = int(os.environ.get("GW_PORT", "8765"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    state = "계정 있음" if has_users() else "계정 없음 - login.html에서 최초 설정" + (" (설정 키 필요)" if setup_key() else "")
    print("AI 그룹웨어 서버: http://0.0.0.0:%d  (%s)" % (port, state), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
