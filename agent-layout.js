/**
 * 에이전트 공통 레이아웃 - agent.html 템플릿 구조를 적용합니다.
 * 각 에이전트 페이지에서 window.AGENT_PAGE = { title: "제목", homeHref: "링크" } 설정 후 이 스크립트를 로드하세요.
 */
(function () {
  var config = window.AGENT_PAGE || { title: "Agent", homeHref: "index.html" };
  var title = config.title || "Agent";
  var homeHref = config.homeHref || "index.html";

  var wrapper = document.createElement("div");
  wrapper.className = "agent-page";
  wrapper.innerHTML =
    "<header class=\"agent-page-header\">" +
    "<h1 class=\"agent-page-title\" id=\"agent-page-title\">" + escapeHtml(title) + "</h1>" +
    "<a href=\"" + escapeHtml(homeHref) + "\" class=\"agent-page-home-btn\" id=\"agent-page-home-btn\">홈으로 돌아가기</a>" +
    "</header>" +
    "<main class=\"agent-page-body\" id=\"agent-page-body\"></main>";

  var content = document.getElementById("agent-content");
  var body = document.body;
  if (content) {
    while (content.firstChild) {
      wrapper.querySelector("#agent-page-body").appendChild(content.firstChild);
    }
    content.parentNode.removeChild(content);
  }
  body.insertBefore(wrapper, body.firstChild);

  document.title = title + " - AI 그룹웨어";

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
})();
