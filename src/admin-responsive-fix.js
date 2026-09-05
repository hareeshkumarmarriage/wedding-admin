(() => {
  const STYLE_ID = "admin-responsive-fix";
  const BAR = ".admin-polish-savebar";
  let dirty = false;
  let ready = false;
  let lastSavedSignature = "";

  const css = `
    html, body { max-width:100%; overflow-x:hidden; }
    body.admin-polished { overflow-x:hidden !important; }
    @media (max-width: 767px) {
      body.admin-polished header > div { min-width:0; }
      body.admin-polished header { overflow:hidden; }
      body.admin-polished main { width:100%; min-width:0 !important; padding:12px !important; padding-bottom:88px !important; box-sizing:border-box; }
      body.admin-polished main > div { width:100%; min-width:0 !important; max-width:none !important; }
      body.admin-polished main .grid { min-width:0 !important; width:100%; }
      body.admin-polished main section { min-width:0; max-width:100%; box-sizing:border-box; }
      body.admin-polished main input, body.admin-polished main textarea, body.admin-polished main select { max-width:100%; box-sizing:border-box; }
      body.admin-polished main textarea { min-height:110px; }
      body.admin-polished main .flex { min-width:0; }
      body.admin-polished main .overflow-x-auto { max-width:100%; scrollbar-width:none; overscroll-behavior-x:contain; }
      body.admin-polished main .overflow-x-auto::-webkit-scrollbar { display:none; }
      body.admin-polished main button { max-width:100%; }
      body.admin-polished main .flex-wrap > button { flex:0 1 auto; }
      .admin-polish-savebar { bottom:max(8px, env(safe-area-inset-bottom)) !important; width:calc(100% - 20px) !important; max-width:520px !important; box-sizing:border-box; }
      .admin-polish-savebar .status { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .admin-polish-savebar button { flex:0 0 auto; }
      .admin-polish-toast { bottom:78px !important; }
      .admin-polish-modal { padding:max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)); }
      .admin-polish-modal-card { width:100% !important; max-width:100% !important; }
    }
    @media (min-width:768px) and (max-width:1023px) {
      body.admin-polished main { min-width:0 !important; }
      body.admin-polished main > div { min-width:0 !important; }
    }
  `;

  function installCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function editableSignature() {
    return [...document.querySelectorAll("input, textarea, select")].map((el) => {
      const e = el;
      if (e.type === "checkbox" || e.type === "radio") return `${e.name}|${e.checked}`;
      return `${e.name}|${e.value}`;
    }).join("\u001f");
  }

  function getBar() { return document.querySelector(BAR); }

  function setBarVisible(show) {
    const bar = getBar();
    if (!bar) return;
    bar.hidden = !show;
    bar.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function markDirty() {
    if (!ready) return;
    dirty = editableSignature() !== lastSavedSignature;
    setBarVisible(dirty);
  }

  function markSaved() {
    lastSavedSignature = editableSignature();
    dirty = false;
    setBarVisible(false);
  }

  function markDiscarded() {
    dirty = false;
    setBarVisible(false);
  }

  function bindBar() {
    const bar = getBar();
    if (!bar || bar.dataset.responsiveBound === "1") return;
    bar.dataset.responsiveBound = "1";
    bar.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!target) return;
      const action = target.getAttribute("data-action") || target.textContent?.trim().toLowerCase() || "";
      if (action.includes("save")) window.setTimeout(markSaved, 250);
      if (action.includes("discard") || action.includes("reset")) window.setTimeout(markDiscarded, 250);
    });
  }

  function observe() {
    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);
    document.addEventListener("click", (event) => {
      const el = event.target instanceof Element ? event.target.closest("button") : null;
      if (!el) return;
      const text = (el.textContent || "").trim().toLowerCase();
      const action = el.getAttribute("data-action") || "";
      if (action.includes("save") || text === "save" || text.includes("save all") || text.includes("save changes")) {
        window.setTimeout(markSaved, 300);
      } else if (action.includes("discard") || text.includes("discard") || text === "reset") {
        window.setTimeout(markDiscarded, 300);
      }
    }, true);

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "You have unsaved changes.";
    });

    const observer = new MutationObserver(() => {
      bindBar();
      if (!ready) return;
      // The older polish layer may try to display its bar after unrelated clicks.
      // Only allow it when an actual editable value differs from the saved snapshot.
      if (!dirty) setBarVisible(false);
    });
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["hidden","style","class"] });
  }

  function initialize() {
    installCss();
    observe();
    bindBar();
    window.setTimeout(() => {
      lastSavedSignature = editableSignature();
      ready = true;
      dirty = false;
      setBarVisible(false);
    }, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else initialize();
})();
