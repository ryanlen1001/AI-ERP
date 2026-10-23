#!/usr/bin/env python3
"""AI 그룹웨어 공유 서버.

정적 파일을 제공하고, 브라우저 localStorage(ai-groupware-*) 값을 data/groupware.db(SQLite)에 보관해
여러 기기가 같은 데이터를 보도록 한다. 표준 라이브러리만 사용한다.

  python3 server.py                  # 0.0.0.0:8765
  GW_PORT=9000 python3 server.py
  GW_PASSWORD=비밀번호 python3 server.py   # 또는 data/password 파일 (기본 인증, 아이디는 아무거나)
"""
import base64
import json
import os
import sqlite3
import threading
from datetime import date, timedelta
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "groupware.db")
LEGACY_JSON = os.path.join(DATA_DIR, "store.json")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
BACKUP_DAILY_DAYS = 90
KEY_PREFIX = "ai-groupware-"
MAX_BODY = 20 * 1024 * 1024
BLOCKED_PREFIXES = ("/data", "/server.py", "/deploy", "/.")

lock = threading.Lock()


def load_password():
    pw = os.environ.get("GW_PASSWORD")
    if pw:
        return pw
    path = os.path.join(DATA_DIR, "password")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read().strip() or None
    return None


def connect():
    os.makedirs(DATA_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH, timeout=10)


def init_db():
    """테이블을 만들고, DB가 비어 있으면 예전 data/store.json 내용을 한 번 옮겨 담는다."""
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, v INTEGER NOT NULL, value TEXT NOT NULL)")
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


init_db()
PASSWORD = load_password()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def authorized(self):
        if not PASSWORD:
            return True
        header = self.headers.get("Authorization", "")
        if header.startswith("Basic "):
            try:
                _, _, pw = base64.b64decode(header[6:]).decode("utf-8").partition(":")
                if pw == PASSWORD:
                    return True
            except Exception:
                pass
        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header("WWW-Authenticate", 'Basic realm="AI Groupware", charset="UTF-8"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def store_key(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/store/"):
            return None
        key = unquote(path[len("/api/store/"):])
        return key if key.startswith(KEY_PREFIX) else None

    def do_GET(self):
        if not self.authorized():
            return
        path = urlsplit(self.path).path
        if path == "/api/store":
            with lock:
                return self.send_json(HTTPStatus.OK, load_store())
        if self.blocked(path):
            return self.send_error(HTTPStatus.NOT_FOUND)
        return super().do_GET()

    @staticmethod
    def blocked(path):
        path = os.path.normpath(unquote(path)).replace("\\", "/")
        if path.startswith("/."):
            return True
        return any(path == p or path.startswith(p + "/") for p in BLOCKED_PREFIXES if p != "/.")

    def do_HEAD(self):
        if not self.authorized():
            return
        if self.blocked(urlsplit(self.path).path):
            return self.send_error(HTTPStatus.NOT_FOUND)
        super().do_HEAD()

    def do_PUT(self):
        if not self.authorized():
            return
        key = self.store_key()
        if key is None:
            return self.send_error(HTTPStatus.NOT_FOUND)
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        value = self.rfile.read(length).decode("utf-8")
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
        if not self.authorized():
            return
        key = self.store_key()
        if key is None:
            return self.send_error(HTTPStatus.NOT_FOUND)
        with lock:
            delete_entry(key)
        self.send_json(HTTPStatus.OK, {"ok": True})


def main():
    port = int(os.environ.get("GW_PORT", "8765"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("AI 그룹웨어 서버: http://0.0.0.0:%d  (비밀번호 %s)" % (port, "사용" if PASSWORD else "없음"), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
