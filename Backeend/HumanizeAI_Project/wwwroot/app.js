const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://ai-humanizer-0hs5.onrender.com";

const TONE_IDS = { casual: 1, formal: 2, academic: 3, professional: 4 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getUser() {
  try { return JSON.parse(localStorage.getItem("hai_user")); } catch { return null; }
}
function setUser(u) { localStorage.setItem("hai_user", JSON.stringify(u)); }
function clearUser() { localStorage.removeItem("hai_user"); }
function currentUserId() { return getUser()?.userId ?? 1; }
function requireAuth() {
  if (!getUser()) { window.location.replace("login.html"); return false; }
  return true;
}

function rememberName(email, name) {
  try {
    const m = JSON.parse(localStorage.getItem("hai_names") || "{}");
    m[(email || "").toLowerCase()] = name;
    localStorage.setItem("hai_names", JSON.stringify(m));
  } catch {}
}
function lookupName(email) {
  try {
    const m = JSON.parse(localStorage.getItem("hai_names") || "{}");
    return m[(email || "").toLowerCase()] || "";
  } catch { return ""; }
}
function displayName() {
  const u = getUser();
  return (u && (u.displayName || u.username)) || "";
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

function injectStyles() {
  if (document.getElementById("hai-style")) return;
  const s = document.createElement("style");
  s.id = "hai-style";
  s.textContent =
    ".hai-alert{display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.45;border:1px solid transparent;}" +
    ".hai-alert .hai-ico{flex:0 0 auto;font-weight:700;}" +
    ".hai-alert--error{background:#fdecec;border-color:#f3bcbc;color:#b42318;}" +
    ".hai-alert--success{background:#eafaf0;border-color:#a9e3bf;color:#1a7f43;}" +
    ".hai-alert--info{background:#eef2fb;border-color:#c3d2f5;color:#1d4ed8;}" +
    ".hai-field-error{color:#b42318;font-size:12.5px;margin-top:6px;}" +
    "input.hai-invalid{border-color:#e5484d !important;box-shadow:0 0 0 3px rgba(229,72,77,.12) !important;}" +
    ".hai-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(200,149,109,.3);border-top-color:#C8956D;border-radius:50%;animation:hai-spin .7s linear infinite;}" +
    "@keyframes hai-spin{to{transform:rotate(360deg)}}" +
    ".hai-loading{display:flex;align-items:center;gap:10px;color:#8D8477;font-size:15px;}" +
    ".hai-dots::after{content:'';animation:hai-dots 1.2s steps(4,end) infinite;}" +
    "@keyframes hai-dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}" +
    ".hai-loadwrap{display:flex;flex-direction:column;gap:16px;}" +
    ".hai-loadhead{display:flex;align-items:center;gap:10px;color:#8D8477;font-size:15px;font-weight:500;}" +
    ".hai-skel{display:flex;flex-direction:column;gap:11px;}" +
    ".hai-skel-line{height:12px;border-radius:6px;background:linear-gradient(90deg,#efe7d8 25%,#faf4ea 37%,#efe7d8 63%);background-size:400% 100%;animation:hai-shimmer 1.4s ease infinite;}" +
    "@keyframes hai-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}" +
    ".hai-navtoggle{display:none;background:none;border:1px solid #e5ddcf;border-radius:8px;font-size:18px;line-height:1;padding:6px 11px;cursor:pointer;color:#5b5346;}" +
    "@media(max-width:860px){header nav{position:relative;}.hai-navtoggle{display:inline-flex;align-items:center;}" +
    'header nav ul[role="list"].hai-open{display:flex !important;flex-direction:column;gap:10px;position:absolute;top:calc(100% + 8px);right:0;left:0;background:#fffdf8;border:1px solid #ece3d2;border-radius:12px;padding:14px 16px;box-shadow:0 12px 30px rgba(0,0,0,.10);z-index:60;}}' +
    '@media(max-width:640px){section[aria-labelledby="table-title"]{overflow-x:auto;-webkit-overflow-scrolling:touch;}section[aria-labelledby="table-title"] table{min-width:460px;}}' +
    'div[role="search"][aria-label="Filter history"] > div:last-child{display:flex;align-items:center;gap:10px;}' +
    'div[role="search"][aria-label="Filter history"] label[for="mode-filter"]{white-space:nowrap;margin:0;}' +
    '@media(max-width:560px){div[role="search"][aria-label="Filter history"] > div:last-child{width:100%;}div[role="search"][aria-label="Filter history"] select{flex:1;}}' +
    "button,input,select,textarea,a{transition:box-shadow .18s ease,transform .12s ease,filter .18s ease,border-color .18s ease;}" +
    "button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(200,149,109,.35);}" +
    "button:not(:disabled):hover{filter:brightness(.97);}button:not(:disabled):active{transform:translateY(1px);}" +
    '[aria-label="Today\'s statistics"] > div > div,[aria-label="Summary statistics"] > div,section[aria-labelledby="history-list-label"] [role="listitem"]{transition:transform .18s ease,box-shadow .18s ease;}' +
    '[aria-label="Today\'s statistics"] > div > div:hover,[aria-label="Summary statistics"] > div:hover,section[aria-labelledby="history-list-label"] [role="listitem"]:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.07);}' +
    ".hai-alert{animation:hai-fade .25s ease;}@keyframes hai-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
    ".hai-toast{position:fixed;bottom:22px;right:22px;background:#2f2a23;color:#fff;padding:12px 16px;border-radius:10px;font-size:14px;box-shadow:0 12px 32px rgba(0,0,0,.22);opacity:0;transform:translateY(10px);transition:opacity .22s ease,transform .22s ease;z-index:9999;}" +
    ".hai-toast.hai-show{opacity:1;transform:none;}" +
    ".hai-del{background:none;border:1px solid #eedcdc;color:#b42318;border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer;}" +
    ".hai-del:hover{background:#fdecec;}" +
    ".hai-copy{background:none;border:1px solid #e5ddcf;color:#6b6253;border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer;}" +
    ".hai-copy:hover{background:#f3ece0;}" +
    ".hai-hist-label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin:0 0 4px;}" +
    ".hai-hist-block{padding:10px 12px;border-radius:10px;margin-bottom:10px;}" +
    ".hai-hist-text{margin:0;line-height:1.55;}" +
    ".hai-hist-orig{background:#f4f1ea;}" +
    ".hai-hist-orig .hai-hist-label{color:#a99c88;}" +
    ".hai-hist-orig .hai-hist-text{color:#7a715f;}" +
    ".hai-hist-result{background:#f7efe2;border-left:3px solid #C8956D;}" +
    ".hai-hist-result .hai-hist-label{color:#b07d4f;}" +
    ".hai-hist-result .hai-hist-text{color:#3f3a31;}" +
    ".hai-hist-foot{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(0,0,0,.05);}" +
    ".hai-hist-score{font-weight:600;color:#4f483d;margin-right:auto;}" +
    ".hai-hist-title{font-size:16px;font-weight:700;color:#3f3a31;margin:0 0 12px;}" +
    'div[role="toolbar"][aria-label="Humanization options"] > div:last-child{flex-wrap:wrap;gap:8px;}' +
    ".hai-detect{display:flex;flex-direction:column;gap:8px;}" +
    ".hai-detect-score{font-size:30px;font-weight:800;line-height:1;}" +
    ".hai-detect-verdict{font-size:14px;color:#6b6253;font-weight:600;}" +
    ".hai-meter{height:9px;border-radius:6px;background:#eee5d6;overflow:hidden;}" +
    ".hai-meter > div{height:100%;border-radius:6px;transition:width .45s ease;}" +
    ".hai-detect-human{font-size:13px;color:#8a7f6d;}" +
    'section[aria-labelledby="features-heading"] article{transition:transform .2s ease,box-shadow .2s ease;}' +
    'section[aria-labelledby="features-heading"] article:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.08);}' +
    'section[aria-labelledby="how-heading"] li{transition:transform .2s ease;}' +
    'section[aria-labelledby="how-heading"] li:hover{transform:translateY(-2px);}' +
    'section[aria-labelledby="hero-heading"] a,section[aria-labelledby="cta-heading"] a{transition:transform .15s ease,box-shadow .2s ease,filter .18s ease;}' +
    'section[aria-labelledby="hero-heading"] a:hover,section[aria-labelledby="cta-heading"] a:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,.12);}' +
    'section[aria-labelledby="hero-heading"] h1{letter-spacing:-.025em;line-height:1.08;}' +
    'section[aria-labelledby="hero-heading"] > div:first-of-type{border:1px solid #ecdfc8;}' +
    ".hai-usermenu-wrap{position:relative;}" +
    '[aria-label="User avatar"]{cursor:pointer;user-select:none;transition:transform .15s ease,box-shadow .15s ease;}' +
    '[aria-label="User avatar"]:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.12);}' +
    ".hai-menu{position:absolute;top:calc(100% + 10px);right:0;min-width:214px;max-width:calc(100vw - 32px);background:#fffdf8;border:1px solid #ece3d2;border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,.16);padding:8px;z-index:80;opacity:0;transform:translateY(-8px) scale(.97);transform-origin:top right;pointer-events:none;transition:opacity .18s ease,transform .2s cubic-bezier(.2,.8,.2,1);}" +
    ".hai-menu.hai-open{opacity:1;transform:none;pointer-events:auto;}" +
    ".hai-menu-head{padding:10px 12px 12px;border-bottom:1px solid #f0e8d8;margin-bottom:6px;}" +
    ".hai-menu-name{font-weight:700;color:#3f3a31;font-size:14px;}" +
    ".hai-menu-mail{font-size:12px;color:#a99c88;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
    ".hai-menu a,.hai-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border:none;background:none;border-radius:9px;font-size:14px;color:#5b5346;cursor:pointer;font-weight:500;font-family:inherit;}" +
    ".hai-menu a:hover,.hai-menu button:hover{background:#f4ece0;color:#3f3a31;}" +
    ".hai-menu .hai-logout{color:#b42318;}" +
    ".hai-menu .hai-logout:hover{background:#fdecec;}" +
    ".hai-menu svg{width:16px;height:16px;flex:0 0 auto;}" +
    ".hai-fadeout{animation:hai-fadeout .46s ease forwards;}" +
    "@keyframes hai-fadeout{to{opacity:0;transform:scale(.985);filter:blur(1px);}}" +
    ".hai-detect-flagwrap{margin-top:6px;padding-top:14px;border-top:1px solid #f0e8d8;}" +
    ".hai-detect-flaghead{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#a99c88;margin-bottom:8px;}" +
    ".hai-detect-excerpt{font-size:14px;line-height:1.6;color:#5b5346;max-height:180px;overflow:auto;}" +
    ".hai-hl{background:#f7dcae;border-radius:4px;padding:0 3px;box-shadow:inset 0 -2px 0 rgba(200,149,109,.45);color:#7a4f1e;}";
  document.head.appendChild(s);
}

function showAlert(host, msg, type) {
  injectStyles();
  let el = host.querySelector(".hai-alert");
  if (!el) {
    el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    host.appendChild(el);
  }
  el.className = "hai-alert hai-alert--" + type;
  const ico = type === "error" ? "⚠" : type === "success" ? "✓" : "…";
  el.innerHTML = '<span class="hai-ico"></span><span class="hai-msg"></span>';
  el.querySelector(".hai-ico").textContent = ico;
  el.querySelector(".hai-msg").textContent = msg;
}
function clearAlert(host) {
  const el = host.querySelector(".hai-alert");
  if (el) el.remove();
}

function toast(msg) {
  injectStyles();
  const t = document.createElement("div");
  t.className = "hai-toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("hai-show"));
  setTimeout(() => { t.classList.remove("hai-show"); setTimeout(() => t.remove(), 260); }, 2300);
}

function fieldError(input, msg) {
  injectStyles();
  if (!input) return;
  input.classList.toggle("hai-invalid", !!msg);
  const holder = input.parentElement;
  let e = holder.querySelector(".hai-field-error");
  if (msg) {
    if (!e) { e = document.createElement("div"); e.className = "hai-field-error"; holder.appendChild(e); }
    e.textContent = msg;
  } else if (e) {
    e.remove();
  }
}
function clearFieldErrors(form) {
  form.querySelectorAll(".hai-field-error").forEach((e) => e.remove());
  form.querySelectorAll(".hai-invalid").forEach((i) => i.classList.remove("hai-invalid"));
}

function paintUser() {
  const name = displayName();
  if (!name) return;
  document.querySelectorAll('[aria-label="User avatar"]').forEach((a) => {
    const base = name.includes("@") ? name.split("@")[0] : name;
    const initials = base.trim().split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    a.textContent = initials || "U";
    a.title = name;
  });
}

function initLogin() {
  const form = document.querySelector("form");
  if (!form) return;
  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("password");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    clearAlert(form);
    const email = emailEl?.value.trim() || "";
    const password = passEl?.value || "";
    let ok = true;
    if (!email) { fieldError(emailEl, "Please enter your email address."); ok = false; }
    else if (!EMAIL_RE.test(email)) { fieldError(emailEl, "That doesn't look like a valid email address."); ok = false; }
    if (!password) { fieldError(passEl, "Please enter your password."); ok = false; }
    if (!ok) { showAlert(form, "Please fix the highlighted fields.", "error"); return; }

    showAlert(form, "Signing in…", "info");
    try {
      const data = await api("/api/auth/login", { method: "POST", body: { username: email, password } });
      data.displayName = lookupName(email) || data.username;
      data.email = email;
      setUser(data);
      const who = lookupName(email);
      showAlert(form, who ? `Welcome back, ${who}!` : "Welcome back!", "success");
      window.location.href = "dashboard.html";
    } catch (err) {
      const friendly = /incorrect|unauthor/i.test(err.message)
        ? "No account matches that email and password. Check your details, or sign up for a free account."
        : err.message;
      showAlert(form, friendly, "error");
    }
  });
}

function initSignup() {
  const form = document.querySelector("form");
  if (!form) return;
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const confirmEl = document.getElementById("confirm-password");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    clearAlert(form);
    const name = nameEl?.value.trim() || "";
    const email = emailEl?.value.trim() || "";
    const password = passEl?.value || "";
    const confirm = confirmEl?.value || "";
    let ok = true;
    if (!name) { fieldError(nameEl, "Please enter your name."); ok = false; }
    else if (name.length < 2) { fieldError(nameEl, "Name must be at least 2 characters."); ok = false; }
    if (!email) { fieldError(emailEl, "Please enter your email address."); ok = false; }
    else if (!EMAIL_RE.test(email)) { fieldError(emailEl, "That doesn't look like a valid email address."); ok = false; }
    if (!password) { fieldError(passEl, "Please create a password."); ok = false; }
    else if (password.length < 6) { fieldError(passEl, "Password must be at least 6 characters."); ok = false; }
    if (!confirm) { fieldError(confirmEl, "Please confirm your password."); ok = false; }
    else if (password && confirm !== password) { fieldError(confirmEl, "Passwords do not match."); ok = false; }
    if (!ok) { showAlert(form, "Please fix the highlighted fields.", "error"); return; }

    showAlert(form, "Creating your account…", "info");
    try {
      await api("/api/auth/register", { method: "POST", body: { username: email, email, password } });
      rememberName(email, name);
      showAlert(form, "Account created! Taking you to login…", "success");
      setTimeout(() => (window.location.href = "login.html"), 900);
    } catch (err) {
      const friendly = /already exists/i.test(err.message)
        ? "An account with this email already exists. Try logging in instead."
        : err.message;
      showAlert(form, friendly, "error");
    }
  });
}

function initDashboard() {
  if (!requireAuth()) return;
  paintUser();
  initNav();
  greetOnDashboard();
  loadDashboardStats();
  const input = document.getElementById("input-text");
  const output = document.getElementById("output-text");
  const counter = document.getElementById("char-count");
  const toneSel = document.getElementById("tone-select");
  const modeBtns = Array.from(document.querySelectorAll("[data-mode]"));
  const humanizeBtn = document.getElementById("humanize-btn");
  const clearBtn = document.getElementById("clear-btn");
  const copyBtn = document.getElementById("copy-btn");
  const saveBtn = document.getElementById("save-btn");

  let mode = "basic";

  const draftKey = "hai_draft_" + currentUserId();
  if (input) {
    const saved = localStorage.getItem(draftKey);
    if (saved && !input.value) input.value = saved;
  }
  if (input && counter) {
    const updateCount = () => {
      const v = input.value;
      const words = v.trim() ? v.trim().split(/\s+/).length : 0;
      counter.textContent = `${words} words · ${v.length} / 5000`;
      localStorage.setItem(draftKey, v);
    };
    input.addEventListener("input", updateCount);
    updateCount();
  }

  saveBtn?.addEventListener("click", () => {
    const text = output?.querySelector("p")?.innerText?.trim();
    if (!text) { toast("Nothing to download yet."); return; }
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "humanized.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Downloaded humanized.txt");
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      updateActionLabel();
    });
  });

  const prefMode = localStorage.getItem("hai_pref_mode");
  if (prefMode === "advanced" || prefMode === "basic") {
    document.querySelector(`[data-mode="${prefMode}"]`)?.click();
  }
  const activateDetect = () => {
    if (location.hash === "#detect") {
      document.querySelector('[data-mode="detect"]')?.click();
      input?.focus();
    }
  };
  activateDetect();
  window.addEventListener("hashchange", activateDetect);

  const sample = "Furthermore, it is important to note that artificial intelligence is fundamentally transforming numerous industries. Moreover, these technologies facilitate significant improvements in efficiency, and it should be noted that they will subsequently reshape the future of work.";
  if (clearBtn && input && !document.getElementById("hai-example")) {
    const ex = document.createElement("button");
    ex.type = "button";
    ex.id = "hai-example";
    ex.textContent = "Try an example";
    ex.addEventListener("click", () => {
      input.value = sample;
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
    clearBtn.parentElement.insertBefore(ex, clearBtn);
  }

  function updateActionLabel() {
    if (!humanizeBtn) return;
    const label = mode === "detect" ? "Check AI score" : "Humanize";
    humanizeBtn.innerHTML = `${label} <span aria-hidden="true">→</span>`;
  }
  updateActionLabel();

  input?.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      humanizeBtn?.click();
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (input) input.value = "";
    if (output) output.innerHTML = "<span>Humanized text will appear here…</span>";
    if (counter) counter.textContent = "0 words · 0 / 5000";
    localStorage.removeItem(draftKey);
  });

  copyBtn?.addEventListener("click", async () => {
    const text = output?.querySelector("p")?.innerText?.trim() || output?.innerText?.trim();
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
        toast("Copied to clipboard");
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch {}
    }
  });

  humanizeBtn?.addEventListener("click", async () => {
    const text = input?.value.trim();
    if (!text) { output.innerHTML = "<span>Please paste some text first.</span>"; return; }

    if (mode === "detect") {
      output.innerHTML = detectLoading();
      humanizeBtn.disabled = true;
      try {
        const d = await api("/api/humanize/detect", {
          method: "POST",
          body: { originalText: text, userId: currentUserId(), toneId: 1 },
        });
        showDetect(output, d, text);
        toast(`AI score: ${d.aiScore}% · ${d.verdict}`);
      } catch (err) {
        output.innerHTML = "<span>Couldn't check the score.</span>";
        toast("Couldn't check: " + err.message);
      } finally {
        humanizeBtn.disabled = false;
      }
      return;
    }

    const toneId = TONE_IDS[toneSel?.value] ?? 1;
    const length = document.getElementById("length-select")?.value || "same";
    output.innerHTML = loadingBlock("Humanizing your text");
    const btnHtml = humanizeBtn.innerHTML;
    humanizeBtn.disabled = true;
    humanizeBtn.innerHTML = '<span class="hai-spinner" style="border-top-color:#fff;border-color:rgba(255,255,255,.4);border-top-color:#fff;"></span>';
    try {
      const data = await api(`/api/humanize/${mode}`, {
        method: "POST",
        body: { originalText: text, userId: currentUserId(), toneId, length },
      });
      output.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = cleanText(data.humanizedText);
      output.appendChild(p);
      const meta = document.createElement("small");
      meta.style.cssText = "display:block;margin-top:8px;color:#64748b;";
      meta.textContent = `AI score: ${data.aiScore}%  ·  Human score: ${data.humanScore}%  ·  ${data.message}`;
      output.appendChild(meta);
      bumpMode(mode);
      loadDashboardStats();
    } catch (err) {
      output.innerHTML = "";
      const p = document.createElement("p");
      p.style.color = "#b42318";
      p.textContent = "Something went wrong: " + err.message;
      output.appendChild(p);
    } finally {
      humanizeBtn.disabled = false;
      humanizeBtn.innerHTML = btnHtml;
    }
  });
}

function initHistory() {
  if (!requireAuth()) return;
  paintUser();
  initNav();
  const listHost = document.querySelector('main [role="list"]');
  const search = document.getElementById("history-search");
  if (!listHost) return;

  let rows = [];
  const render = () => {
    const q = (search?.value || "").toLowerCase().trim();
    const filtered = rows.filter((r) => {
      if (!q) return true;
      const hay = (makeTitle(r.inputText) + " " + (r.inputText || "") + " " + (r.outputText || "")).toLowerCase();
      return hay.includes(q);
    });
    listHost.innerHTML = "";
    if (!filtered.length) {
      listHost.innerHTML = '<article role="listitem"><div><p>No history yet - humanize some text on the dashboard to see it here.</p></div></article>';
      return;
    }
    filtered.forEach((r) => {
      const a = document.createElement("article");
      a.setAttribute("role", "listitem");
      a.innerHTML = `
        <div>
          <time>${escapeHtml(r.processedAt || "")}</time>
          <span>${escapeHtml(r.toneName || "")}</span>
        </div>
        <p class="hai-hist-title">${escapeHtml(makeTitle(r.inputText))}</p>
        <div class="hai-hist-block hai-hist-orig">
          <p class="hai-hist-label">Original</p>
          <p class="hai-hist-text">${escapeHtml(truncate(r.inputText, 180))}</p>
        </div>
        <div class="hai-hist-block hai-hist-result">
          <p class="hai-hist-label">Humanized</p>
          <p class="hai-hist-text">${escapeHtml(truncate(r.outputText, 180))}</p>
        </div>
        <div class="hai-hist-foot">
          <span class="hai-hist-score">AI ${r.aiScore}% · Human ${r.humanScore}%</span>
          <button type="button" class="hai-copy" data-id="${r.historyId}">Copy</button>
          <button type="button" class="hai-del" data-id="${r.historyId}">Delete</button>
        </div>`;
      listHost.appendChild(a);
    });
  };

  listHost.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest(".hai-copy");
    if (copyBtn) {
      const row = rows.find((r) => r.historyId === Number(copyBtn.dataset.id));
      if (row) {
        try { await navigator.clipboard.writeText(cleanText(row.outputText)); toast("Copied humanized text"); } catch {}
      }
      return;
    }
    const btn = e.target.closest(".hai-del");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (!confirm("Delete this history entry?")) return;
    btn.disabled = true;
    try {
      await api(`/api/humanize/history/${id}`, { method: "DELETE" });
      rows = rows.filter((r) => r.historyId !== id);
      render();
      toast("Entry deleted");
    } catch (err) {
      btn.disabled = false;
      toast("Couldn't delete: " + err.message);
    }
  });

  search?.addEventListener("input", render);

  listHost.innerHTML = '<article role="listitem"><div><p>Loading…</p></div></article>';
  api(`/api/humanize/history/${currentUserId()}`)
    .then((data) => { rows = Array.isArray(data) ? data : []; render(); })
    .catch((err) => { listHost.innerHTML = `<article role="listitem"><div><p>Couldn't load history: ${escapeHtml(err.message)}</p></div></article>`; });
}

function initAnalytics() {
  if (!requireAuth()) return;
  paintUser();
  initNav();
  api(`/api/humanize/history/${currentUserId()}`)
    .then((data) => {
      const rows = Array.isArray(data) ? data : [];
      const cards = document.querySelectorAll('[aria-label="Summary statistics"] > div > div:last-child');
      if (cards[0]) cards[0].textContent = rows.length;
      if (cards[1]) cards[1].textContent = rows.reduce((s, r) => s + wordCount(r.outputText), 0).toLocaleString();
      if (cards[2]) cards[2].textContent = fmtReduction(avgReduction(rows));

      const modes = getModes();
      const total = (modes.basic || 0) + (modes.advanced || 0);
      const basicPct = total ? Math.round((modes.basic / total) * 100) : 0;
      const bars = document.querySelectorAll('[aria-labelledby="breakdown-title"] [role="progressbar"]');
      applyBar(bars[0], basicPct);
      applyBar(bars[1], total ? 100 - basicPct : 0);

      const tbody = document.querySelector('[aria-labelledby="table-title"] tbody');
      if (tbody) {
        tbody.innerHTML = "";
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="5">No runs yet - humanize some text to see analytics.</td></tr>';
        } else {
          rows.slice(0, 10).forEach((r) => {
            const red = reductionOf(r);
            const tr = document.createElement("tr");
            tr.innerHTML =
              `<td>${escapeHtml((r.processedAt || "").split(" ")[0])}</td>` +
              `<td><span>${escapeHtml(r.toneName || "")}</span></td>` +
              `<td>${wordCount(r.inputText)}</td>` +
              `<td>${wordCount(r.outputText)}</td>` +
              `<td>${fmtReduction(red)}</td>`;
            tbody.appendChild(tr);
          });
        }
      }
      drawUsageChart(rows);
    })
    .catch(() => {});
}

function initSettings() {
  if (!requireAuth()) return;
  paintUser();
  initNav();
  const u = getUser();
  if (u) {
    const nameInput = document.getElementById("profile-name");
    if (nameInput) nameInput.value = displayName() || nameInput.value;
    const emailInput = document.getElementById("profile-email");
    if (emailInput && u.username) emailInput.value = u.username;
  }
  const profileForm = document.querySelector('section[aria-labelledby="profile-heading"] form');
  profileForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nm = document.getElementById("profile-name")?.value.trim();
    if (!nm) { showAlert(profileForm, "Name can't be empty.", "error"); return; }
    if (u?.username) rememberName(u.username, nm);
    if (u) { u.displayName = nm; setUser(u); }
    paintUser();
    showAlert(profileForm, "Profile saved.", "success");
  });

  const modeSel = document.getElementById("default-mode");
  if (modeSel) modeSel.value = localStorage.getItem("hai_pref_mode") || modeSel.value;
  const prefForm = document.querySelector('section[aria-labelledby="prefs-heading"] form');
  prefForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (modeSel) localStorage.setItem("hai_pref_mode", modeSel.value);
    showAlert(prefForm, "Preferences saved.", "success");
  });

  const logoutBtn = Array.from(document.querySelectorAll("button")).find((b) => /log\s*out/i.test(b.textContent));
  logoutBtn?.addEventListener("click", doLogout);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function cleanText(t) {
  return (t || "").replace(/[—–]/g, " ").replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function detectColor(aiScore) {
  return aiScore >= 60 ? "#b42318" : aiScore >= 30 ? "#b7791f" : "#1a7f43";
}

const AI_MARKERS = [
  "it is important to note", "it should be noted", "it is evident", "in conclusion",
  "in addition", "first and foremost", "in the realm of", "the landscape of",
  "shed light on", "studies have shown", "research indicates", "on the other hand",
  "furthermore", "moreover", "nevertheless", "subsequently", "notably", "one must",
  "delve", "leverage", "utilize", "facilitate", "demonstrate", "commence", "endeavor",
  "paradigm", "comprehensive", "significant", "numerous", "various", "crucial",
  "essential", "vital", "pivotal", "paramount", "realm", "landscape", "tapestry",
  "underscore", "foster", "myriad", "robust", "seamless", "holistic", "intricate",
  "nuanced", "multifaceted", "additionally", "consequently", "therefore", "thus", "hence",
];

function highlightAI(text) {
  const esc = escapeHtml(text);
  const pat = AI_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp("\\b(" + pat + ")\\b", "gi");
  return { html: esc.replace(re, '<mark class="hai-hl">$1</mark>'), hits: (esc.match(re) || []).length };
}

function detectLoading() {
  return '<div class="hai-loadwrap"><div class="hai-loadhead"><span class="hai-spinner"></span><span class="hai-dots">Analyzing for AI patterns</span></div>' +
    '<div class="hai-skel"><div class="hai-skel-line" style="width:42%;height:28px"></div><div class="hai-skel-line" style="width:60%"></div><div class="hai-skel-line" style="width:100%;height:9px"></div></div></div>';
}

function showDetect(output, d, text) {
  const color = detectColor(d.aiScore);
  output.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "hai-detect";
  const hl = text ? highlightAI(text) : { html: "", hits: 0 };
  const flag = text
    ? '<div class="hai-detect-flagwrap"><div class="hai-detect-flaghead">' +
        (hl.hits ? hl.hits + " AI pattern" + (hl.hits === 1 ? "" : "s") + " highlighted" : "No strong AI patterns found") +
      '</div><div class="hai-detect-excerpt">' + (hl.html || escapeHtml(text)) + "</div></div>"
    : "";
  wrap.innerHTML =
    `<div class="hai-detect-score" style="color:${color}">${d.aiScore}% AI</div>` +
    `<div class="hai-detect-verdict">${escapeHtml(d.verdict)}</div>` +
    `<div class="hai-meter"><div style="width:0%;background:${color}"></div></div>` +
    `<div class="hai-detect-human">Human-like: ${d.humanScore}%</div>` +
    flag;
  output.appendChild(wrap);
  requestAnimationFrame(() => { wrap.querySelector(".hai-meter > div").style.width = d.aiScore + "%"; });
}

function doLogout() {
  clearUser();
  document.body.classList.add("hai-fadeout");
  setTimeout(() => { window.location.href = "login.html"; }, 460);
}

function initUserMenu() {
  const avatar = document.querySelector('[aria-label="User avatar"]');
  if (!avatar || avatar.dataset.menu) return;
  injectStyles();
  avatar.dataset.menu = "1";
  avatar.setAttribute("role", "button");
  avatar.setAttribute("tabindex", "0");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", "false");
  const u = getUser() || {};
  const wrap = avatar.parentElement;
  wrap.classList.add("hai-usermenu-wrap");
  const menu = document.createElement("div");
  menu.className = "hai-menu";
  menu.setAttribute("role", "menu");
  const gear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const door = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';
  menu.innerHTML =
    '<div class="hai-menu-head"><div class="hai-menu-name"></div><div class="hai-menu-mail"></div></div>' +
    '<a role="menuitem" href="settings.html">' + gear + "Settings</a>" +
    '<button type="button" role="menuitem" class="hai-logout">' + door + "Log out</button>";
  menu.querySelector(".hai-menu-name").textContent = u.displayName || u.fullName || firstName() || "Account";
  menu.querySelector(".hai-menu-mail").textContent = u.email || u.username || "";
  wrap.appendChild(menu);
  const close = () => { menu.classList.remove("hai-open"); avatar.setAttribute("aria-expanded", "false"); };
  const toggle = () => { const o = menu.classList.toggle("hai-open"); avatar.setAttribute("aria-expanded", String(o)); };
  avatar.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  avatar.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    else if (e.key === "Escape") close();
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  menu.querySelector(".hai-logout").addEventListener("click", doLogout);
}

function loadingBlock(label) {
  return '<div class="hai-loadwrap"><div class="hai-loadhead"><span class="hai-spinner"></span><span class="hai-dots">' + label + '</span></div>' +
    '<div class="hai-skel"><div class="hai-skel-line" style="width:94%"></div><div class="hai-skel-line" style="width:80%"></div><div class="hai-skel-line" style="width:88%"></div><div class="hai-skel-line" style="width:62%"></div></div></div>';
}

function truncate(t, n) {
  t = (t || "").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:]+$/, "") + "…";
}

function makeTitle(text) {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "Untitled";
  let base = t.split(/(?<=[.!?])\s/)[0];
  if (base.length > 52) base = t.split(" ").slice(0, 8).join(" ");
  let title = base.replace(/[.!?,;:]+$/, "");
  if (title.length > 52) title = title.slice(0, 52).replace(/\s+\S*$/, "") + "…";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function bumpMode(mode) {
  const k = "hai_modes_" + currentUserId();
  try {
    const m = JSON.parse(localStorage.getItem(k) || '{"basic":0,"advanced":0}');
    m[mode] = (m[mode] || 0) + 1;
    localStorage.setItem(k, JSON.stringify(m));
  } catch {}
}
function getModes() {
  try { return JSON.parse(localStorage.getItem("hai_modes_" + currentUserId()) || '{"basic":0,"advanced":0}'); }
  catch { return { basic: 0, advanced: 0 }; }
}
function firstName() {
  const n = displayName();
  if (!n) return "there";
  const base = n.includes("@") ? n.split("@")[0] : n;
  return base.split(/[\s._-]+/)[0] || "there";
}
function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }
function reductionOf(r) {
  return Math.max(0, (r.humanScore || 0) - (r.aiScore || 0));
}
function avgReduction(rows) {
  if (!rows.length) return 0;
  return Math.round(rows.reduce((s, r) => s + reductionOf(r), 0) / rows.length);
}
function fmtReduction(v) { return (v ? "−" : "") + Math.abs(v) + "%"; }

function initNav() {
  initUserMenu();
  const nav = document.querySelector("header nav");
  const list = nav?.querySelector('ul[role="list"]');
  if (!nav || !list || nav.querySelector(".hai-navtoggle")) return;
  injectStyles();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hai-navtoggle";
  btn.setAttribute("aria-label", "Toggle navigation menu");
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "☰";
  btn.addEventListener("click", () => {
    const open = list.classList.toggle("hai-open");
    btn.setAttribute("aria-expanded", String(open));
  });
  list.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => list.classList.remove("hai-open")));
  nav.appendChild(btn);
}

function greetOnDashboard() {
  const h2 = document.querySelector("main h2");
  if (!h2 || document.querySelector(".hai-greet")) return;
  const g = document.createElement("p");
  g.className = "hai-greet";
  g.style.cssText = "font-weight:600;color:#C8956D;margin:0 0 4px;";
  g.textContent = `Hi ${firstName()}`;
  h2.parentElement.insertBefore(g, h2);
}

function loadDashboardStats() {
  api(`/api/humanize/history/${currentUserId()}`).then((data) => {
    const rows = Array.isArray(data) ? data : [];
    const tkey = dateKey(new Date());
    const todays = rows.filter((r) => (r.processedAt || "").startsWith(tkey));
    const vals = document.querySelectorAll('[aria-label="Today\'s statistics"] > div > div > div:last-child');
    if (vals[0]) vals[0].textContent = todays.length;
    if (vals[1]) vals[1].textContent = todays.reduce((s, r) => s + wordCount(r.outputText), 0).toLocaleString();
    if (vals[2]) vals[2].textContent = fmtReduction(avgReduction(todays));
  }).catch(() => {});
}

function applyBar(bar, pct) {
  if (!bar) return;
  const span = bar.previousElementSibling?.querySelector("span:last-child");
  if (span) span.textContent = pct + "%";
  bar.setAttribute("aria-valuenow", String(pct));
  const fill = bar.querySelector("div");
  if (fill) fill.style.width = pct + "%";
}

function niceCeil(n) {
  const v = Math.ceil(n / 0.8);
  const step = v <= 10 ? 2 : v <= 20 ? 5 : v <= 50 ? 10 : v <= 100 ? 20 : 50;
  return Math.max(4, Math.ceil(v / step) * step);
}

function drawUsageChart(rows) {
  const canvas = document.getElementById("usage-chart");
  if (!canvas || !canvas.getContext) return;
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({ key: dateKey(d), label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0 });
  }
  rows.forEach((r) => {
    const day = days.find((d) => d.key === (r.processedAt || "").split(" ")[0]);
    if (day) day.count++;
  });

  const cssW = canvas.clientWidth || 600;
  const cssH = canvas.clientHeight || 220;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = cssW * ratio;
  canvas.height = cssH * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 34, padR = 12, padT = 16, padB = 26;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;
  const maxVal = niceCeil(Math.max(...days.map((d) => d.count), 1));
  const ticks = 4;

  ctx.textBaseline = "middle";
  for (let t = 0; t <= ticks; t++) {
    const val = Math.round((maxVal * t) / ticks);
    const y = padT + plotH - (plotH * t) / ticks;
    ctx.strokeStyle = "rgba(0,0,0,.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cssW - padR, y);
    ctx.stroke();
    ctx.fillStyle = "#b0a48f";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(val), padL - 8, y);
  }

  const slot = plotW / days.length;
  const bw = Math.min(46, slot * 0.5);
  days.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const bh = Math.round(plotH * (d.count / maxVal));
    const x = cx - bw / 2;
    const y = padT + plotH - bh;
    if (bh > 0) {
      const grad = ctx.createLinearGradient(0, y, 0, padT + plotH);
      grad.addColorStop(0, "#C8956D");
      grad.addColorStop(1, "#dcb392");
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, [7, 7, 0, 0]);
      else ctx.rect(x, y, bw, bh);
      ctx.fill();
      ctx.fillStyle = "#5b5346";
      ctx.textAlign = "center";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText(String(d.count), cx, y - 9);
    }
    ctx.fillStyle = "#8D8477";
    ctx.textAlign = "center";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(d.label, cx, padT + plotH + 13);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  injectStyles();
  const page = (location.pathname.split("/").pop() || "").toLowerCase();
  if (page === "login.html") initLogin();
  else if (page === "signup.html") initSignup();
  else if (page === "dashboard.html") initDashboard();
  else if (page === "history.html") initHistory();
  else if (page === "analytics.html") initAnalytics();
  else if (page === "settings.html") initSettings();
});
