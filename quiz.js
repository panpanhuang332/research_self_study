/*
 * quiz.js — 研究論文統計自學網站 學習測驗模組
 * ------------------------------------------------------------------
 * 這是一個純前端、無相依套件的測驗注入器。
 * 因為本站是 Next.js App Router 靜態匯出，內容由 React 於 hydration
 * 後產生，直接寫死在 HTML 的節點會在 hydration 時被 React 移除，
 * 所以本檔在 hydration「之後」才把測驗注入 <main>，並以 MutationObserver
 * 監看路由切換（SPA 導覽），必要時重新注入 / 移除。
 *
 * 測驗題庫（QUIZ_DATA）以「頁面 slug」為鍵，例如 "methods/t-test"。
 * 題型：single(單選) / multiple(多選) / truefalse(是非) / short(簡答)。
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var BASE = "/research_self_study";

  /* ============================ 題庫 ============================ */
  /* QUIZ_DATA 於檔案下方（由建置流程注入）。此處先宣告，稍後合併。 */
  var QUIZ_DATA = (window.__RSQ_DATA__ && typeof window.__RSQ_DATA__ === "object")
    ? window.__RSQ_DATA__
    : {};

  /* ========================= 樣式（注入一次） ========================= */
  var STYLE_ID = "rsq-style";
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      ".rsq{margin-top:3rem;border-top:1px solid #e2e8f0;padding-top:2rem;}",
      ".rsq *{box-sizing:border-box;}",
      ".rsq-card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem 1.5rem 1.25rem;box-shadow:0 1px 2px rgba(15,23,42,.04);}",
      ".rsq-head{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;}",
      ".rsq-badge{font-size:.75rem;font-weight:600;color:#4338ca;background:#eef2ff;border:1px solid #e0e7ff;border-radius:9999px;padding:.15rem .6rem;}",
      ".rsq-title{font-size:1.35rem;font-weight:700;color:#0f172a;margin:0;}",
      ".rsq-intro{margin:.75rem 0 0;color:#475569;font-size:.95rem;line-height:1.7;}",
      ".rsq-meta{margin:.35rem 0 0;color:#94a3b8;font-size:.8rem;}",
      ".rsq-q{margin-top:1.5rem;padding-top:1.25rem;border-top:1px dashed #e2e8f0;}",
      ".rsq-q:first-of-type{border-top:none;padding-top:.5rem;}",
      ".rsq-qhead{display:flex;gap:.55rem;align-items:flex-start;}",
      ".rsq-qnum{flex:none;width:1.6rem;height:1.6rem;border-radius:9999px;background:#0f172a;color:#fff;font-size:.85rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:.1rem;}",
      ".rsq-qtype{font-size:.72rem;color:#64748b;background:#f1f5f9;border-radius:9999px;padding:.1rem .5rem;margin-left:.4rem;vertical-align:middle;}",
      ".rsq-qtext{font-weight:600;color:#0f172a;line-height:1.7;font-size:1rem;}",
      ".rsq-opts{list-style:none;margin:.75rem 0 0;padding:0;display:flex;flex-direction:column;gap:.5rem;}",
      ".rsq-opt{display:flex;gap:.6rem;align-items:flex-start;border:1px solid #e2e8f0;border-radius:.6rem;padding:.6rem .75rem;cursor:pointer;transition:background .12s,border-color .12s;}",
      ".rsq-opt:hover{background:#f8fafc;}",
      ".rsq-opt input{margin-top:.2rem;flex:none;}",
      ".rsq-opt span{color:#334155;line-height:1.6;font-size:.95rem;}",
      ".rsq-opt.is-correct{border-color:#16a34a;background:#f0fdf4;}",
      ".rsq-opt.is-wrong{border-color:#dc2626;background:#fef2f2;}",
      ".rsq-mark{margin-left:auto;font-weight:700;font-size:.85rem;}",
      ".rsq-opt.is-correct .rsq-mark{color:#16a34a;}",
      ".rsq-opt.is-wrong .rsq-mark{color:#dc2626;}",
      ".rsq-short textarea{width:100%;min-height:4.5rem;border:1px solid #cbd5e1;border-radius:.6rem;padding:.6rem .75rem;font:inherit;color:#334155;resize:vertical;margin-top:.6rem;}",
      ".rsq-expl{margin-top:.75rem;border-left:3px solid #6366f1;background:#f5f7ff;border-radius:.4rem;padding:.7rem .9rem;color:#334155;font-size:.92rem;line-height:1.75;display:none;}",
      ".rsq-expl.show{display:block;}",
      ".rsq-expl b{color:#1e293b;}",
      ".rsq-ans-label{display:block;font-weight:700;color:#4338ca;margin-bottom:.25rem;}",
      ".rsq-actions{margin-top:1.75rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;}",
      ".rsq-btn{border:none;border-radius:.6rem;padding:.6rem 1.15rem;font-weight:600;font-size:.95rem;cursor:pointer;transition:opacity .12s,background .12s;}",
      ".rsq-btn-primary{background:#4f46e5;color:#fff;}",
      ".rsq-btn-primary:hover{background:#4338ca;}",
      ".rsq-btn-ghost{background:#f1f5f9;color:#334155;}",
      ".rsq-btn-ghost:hover{background:#e2e8f0;}",
      ".rsq-score{font-weight:700;color:#0f172a;margin-left:.25rem;}",
      ".rsq-score .ok{color:#16a34a;}",
      "@media (prefers-color-scheme: dark){",
      ".rsq{border-top-color:#1f2937;}",
      ".rsq-card{background:#0b1220;border-color:#1f2937;box-shadow:none;}",
      ".rsq-title{color:#e2e8f0;}.rsq-intro{color:#94a3b8;}",
      ".rsq-qtext{color:#e2e8f0;}.rsq-opt{border-color:#1f2937;}.rsq-opt span{color:#cbd5e1;}",
      ".rsq-opt:hover{background:#111a2e;}",
      ".rsq-qnum{background:#6366f1;}",
      ".rsq-expl{background:#0f1830;color:#cbd5e1;}",
      ".rsq-btn-ghost{background:#1f2937;color:#e2e8f0;}",
      "}"
    ].join("");
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ========================= 工具函式 ========================= */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function typeLabel(t) {
    return { single: "單選題", multiple: "多選題", truefalse: "是非題", short: "簡答題" }[t] || "題目";
  }
  function currentSlug() {
    var p = location.pathname.replace(/\/+$/, "");
    if (p.indexOf(BASE) === 0) p = p.slice(BASE.length);
    p = p.replace(/^\/+/, "");
    return p; // e.g. "methods/t-test" or "" (home)
  }

  /* ========================= 建立測驗 DOM ========================= */
  function buildQuiz(slug, quiz) {
    var root = el("section", "rsq");
    root.setAttribute("data-rsq-slug", slug);
    root.setAttribute("aria-label", "學習測驗");

    var card = el("div", "rsq-card");
    root.appendChild(card);

    var head = el("div", "rsq-head");
    head.appendChild(el("span", "rsq-badge", "學習測驗"));
    head.appendChild(el("h2", "rsq-title", (quiz.title || "本頁測驗")));
    card.appendChild(head);

    if (quiz.intro) card.appendChild(el("p", "rsq-intro", quiz.intro));
    card.appendChild(el("p", "rsq-meta", "共 " + quiz.questions.length + " 題，作答後點「對答案並看解析」即可查看正解與詳細解析。"));

    var qEls = [];
    quiz.questions.forEach(function (q, qi) {
      var qbox = el("div", "rsq-q");
      var qhead = el("div", "rsq-qhead");
      qhead.appendChild(el("span", "rsq-qnum", String(qi + 1)));
      var qt = el("div", "rsq-qtext");
      qt.appendChild(document.createTextNode(q.question));
      qt.appendChild(el("span", "rsq-qtype", typeLabel(q.type)));
      qhead.appendChild(qt);
      qbox.appendChild(qhead);

      var inputs = [];
      if (q.type === "short") {
        var ta = el("textarea");
        ta.placeholder = "在此寫下你的答案…";
        var wrap = el("div", "rsq-short");
        wrap.appendChild(ta);
        qbox.appendChild(wrap);
      } else {
        var opts = q.options || [];
        var ul = el("ul", "rsq-opts");
        var inputType = (q.type === "multiple") ? "checkbox" : "radio";
        opts.forEach(function (optText, oi) {
          var li = el("li", "rsq-opt");
          var input = document.createElement("input");
          input.type = inputType;
          input.name = "rsq-" + slug.replace(/[^a-z0-9]/gi, "_") + "-" + qi;
          input.value = String(oi);
          li.appendChild(input);
          li.appendChild(el("span", null, optText));
          var mark = el("span", "rsq-mark", "");
          li.appendChild(mark);
          li.addEventListener("click", function (ev) {
            if (ev.target !== input) { input.checked = (inputType === "checkbox") ? !input.checked : true; }
          });
          ul.appendChild(li);
          inputs.push({ input: input, li: li, mark: mark, index: oi });
        });
        qbox.appendChild(ul);
      }

      var expl = el("div", "rsq-expl");
      var ansLabel = el("span", "rsq-ans-label");
      var correctText = "";
      if (q.type === "short") {
        ansLabel.textContent = "參考解答";
        expl.appendChild(ansLabel);
        expl.appendChild(el("div", null, q.sampleAnswer || ""));
        var eh = el("div", null, "");
        eh.style.marginTop = ".5rem";
        eh.innerHTML = "<b>解析：</b>";
        expl.appendChild(eh);
        expl.appendChild(document.createTextNode(q.explanation || ""));
      } else {
        var correct = (q.correct || []).map(function (i) {
          return "（" + String.fromCharCode(65 + i) + "）" + (q.options[i] || "");
        }).join("、");
        ansLabel.textContent = "正確答案：" + correct;
        expl.appendChild(ansLabel);
        var eh2 = el("div", null, "");
        eh2.innerHTML = "<b>解析：</b>";
        expl.appendChild(eh2);
        expl.appendChild(document.createTextNode(q.explanation || ""));
      }
      qbox.appendChild(expl);
      card.appendChild(qbox);
      qEls.push({ q: q, inputs: inputs, expl: expl, box: qbox });
    });

    // 動作列
    var actions = el("div", "rsq-actions");
    var gradeBtn = el("button", "rsq-btn rsq-btn-primary", "對答案並看解析");
    var resetBtn = el("button", "rsq-btn rsq-btn-ghost", "重作");
    var score = el("span", "rsq-score", "");
    actions.appendChild(gradeBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(score);
    card.appendChild(actions);

    function grade() {
      var correctCount = 0, gradable = 0;
      qEls.forEach(function (item) {
        var q = item.q;
        item.expl.classList.add("show");
        if (q.type === "short") return; // 簡答不計分
        gradable++;
        var correctSet = {};
        (q.correct || []).forEach(function (i) { correctSet[i] = true; });
        var allRight = true;
        item.inputs.forEach(function (io) {
          io.li.classList.remove("is-correct", "is-wrong");
          io.mark.textContent = "";
          var chosen = io.input.checked;
          var isCorrect = !!correctSet[io.index];
          if (isCorrect) { io.li.classList.add("is-correct"); io.mark.textContent = "✓ 正解"; }
          if (chosen && !isCorrect) { io.li.classList.add("is-wrong"); io.mark.textContent = "✗ 你的選擇"; allRight = false; }
          if (!chosen && isCorrect) { allRight = false; }
        });
        if (allRight) correctCount++;
      });
      if (gradable > 0) {
        score.innerHTML = "得分：<span class='ok'>" + correctCount + "</span> / " + gradable + " 題（簡答題不計分，請對照參考解答）";
      } else {
        score.textContent = "已顯示所有參考解答與解析。";
      }
    }
    function reset() {
      qEls.forEach(function (item) {
        item.expl.classList.remove("show");
        item.inputs.forEach(function (io) {
          io.input.checked = false;
          io.li.classList.remove("is-correct", "is-wrong");
          io.mark.textContent = "";
        });
        var ta = item.box.querySelector("textarea");
        if (ta) ta.value = "";
      });
      score.textContent = "";
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    gradeBtn.addEventListener("click", grade);
    resetBtn.addEventListener("click", reset);

    return root;
  }

  /* ========================= 注入邏輯 ========================= */
  var injecting = false;
  function injectIfNeeded() {
    if (injecting) return;
    var slug = currentSlug();
    var quiz = QUIZ_DATA[slug];
    var existing = document.querySelector("section.rsq");

    if (!quiz) {
      if (existing) existing.parentNode.removeChild(existing);
      return;
    }
    // 已經是正確頁面的測驗 → 不重複注入
    if (existing && existing.getAttribute("data-rsq-slug") === slug) return;
    if (existing) existing.parentNode.removeChild(existing);

    var main = document.querySelector("main");
    if (!main) return;

    injecting = true;
    try {
      ensureStyle();
      var node = buildQuiz(slug, quiz);
      main.appendChild(node);
    } finally {
      // 讓 MutationObserver 忽略我們自己造成的變動
      setTimeout(function () { injecting = false; }, 0);
    }
  }

  /* MutationObserver：處理 hydration 清除、SPA 導覽切頁 */
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(function () {
      scheduled = false;
      injectIfNeeded();
    }, 60);
    // Next.js 會先改 DOM 再改網址（或反過來），單次檢查可能撞上
    // 網址尚未更新的空窗，因此再排幾次延遲複查以消除競態。
    setTimeout(injectIfNeeded, 200);
    setTimeout(injectIfNeeded, 600);
  }

  function start() {
    injectIfNeeded();
    var obs = new MutationObserver(function () { schedule(); });
    obs.observe(document.body, { childList: true, subtree: true });
    // 早期保險：hydration 前後多試幾次
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      injectIfNeeded();
      if (tries >= 12) clearInterval(iv);
    }, 400);
    window.addEventListener("load", injectIfNeeded);
    window.addEventListener("popstate", schedule);
    // SPA 導覽：攔截 history API，網址一改就重新檢查
    ["pushState", "replaceState"].forEach(function (fn) {
      var orig = history[fn];
      if (typeof orig !== "function") return;
      history[fn] = function () {
        var r = orig.apply(this, arguments);
        schedule();
        return r;
      };
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
