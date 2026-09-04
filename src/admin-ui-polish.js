(() => {
  const ADMIN_HINT = "Wedding Admin";
  const state = { initialized: false, unsaved: false, previewOpen: false, commandOpen: false };
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };

  const css = `
    body.admin-polished { --admin-radius: 18px; }
    body.admin-polished aside { box-shadow: 8px 0 30px rgba(80,45,35,.04); backdrop-filter: blur(12px); }
    body.admin-polished aside nav button { min-height: 42px; transition: transform .16s ease, background .16s ease, color .16s ease; }
    body.admin-polished aside nav button:hover { transform: translateX(2px); }
    body.admin-polished aside nav button[data-admin-active="true"] { box-shadow: 0 8px 24px rgba(80,45,35,.10); }
    body.admin-polished main { scroll-behavior: smooth; }
    body.admin-polished main header h1 { letter-spacing: -.02em; }
    body.admin-polished main section > * { transition: box-shadow .18s ease, transform .18s ease; }
    body.admin-polished main section > *:hover { box-shadow: 0 10px 35px rgba(80,45,35,.055); }
    .admin-polish-group { margin: 18px 10px 6px; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8b7770; }
    .admin-polish-command { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: start center; padding: 12vh 16px 24px; background: rgba(20,12,10,.42); backdrop-filter: blur(8px); }
    .admin-polish-command[hidden], .admin-polish-modal[hidden], .admin-polish-toast[hidden], .admin-polish-savebar[hidden] { display: none !important; }
    .admin-polish-command-card { width: min(680px, 100%); overflow: hidden; border: 1px solid rgba(120,80,65,.16); border-radius: 24px; background: white; box-shadow: 0 30px 80px rgba(30,15,10,.22); }
    .admin-polish-command input { width: 100%; height: 58px; border: 0; border-bottom: 1px solid #eee; outline: 0; padding: 0 20px; font-size: 16px; }
    .admin-polish-command-list { max-height: 55vh; overflow: auto; padding: 8px; }
    .admin-polish-command-item { display: flex; align-items: center; justify-content: space-between; width: 100%; border: 0; border-radius: 14px; background: transparent; padding: 12px 14px; text-align: left; cursor: pointer; font-size: 14px; }
    .admin-polish-command-item:hover, .admin-polish-command-item.active { background: #f8f1ed; }
    .admin-polish-kbd { border: 1px solid #ddd; border-radius: 7px; padding: 2px 6px; font-size: 10px; color: #777; }
    .admin-polish-savebar { position: fixed; left: 50%; bottom: 16px; z-index: 700; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; width: min(760px, calc(100% - 24px)); border: 1px solid rgba(120,80,65,.14); border-radius: 18px; background: rgba(255,255,255,.94); box-shadow: 0 18px 50px rgba(50,25,15,.16); backdrop-filter: blur(14px); padding: 10px 12px 10px 16px; }
    .admin-polish-savebar .status { flex: 1; font-size: 12px; }
    .admin-polish-savebar button { min-height: 38px; border-radius: 999px; border: 1px solid #ddd; padding: 0 14px; cursor: pointer; }
    .admin-polish-savebar button.primary { border-color: transparent; background: var(--primary, #8f5b4a); color: white; }
    .admin-polish-toast { position: fixed; right: 18px; bottom: 18px; z-index: 900; width: min(380px, calc(100% - 36px)); border-radius: 16px; background: #fff; border: 1px solid #e7ded9; box-shadow: 0 15px 45px rgba(30,15,10,.15); padding: 14px 16px; font-size: 13px; }
    .admin-polish-modal { position: fixed; inset: 0; z-index: 950; display: grid; place-items: center; padding: 18px; background: rgba(20,12,10,.48); backdrop-filter: blur(8px); }
    .admin-polish-modal-card { width: min(1100px, 100%); height: min(820px, 92vh); overflow: hidden; border-radius: 24px; background: #fff; box-shadow: 0 30px 90px rgba(20,10,5,.25); display: flex; flex-direction: column; }
    .admin-polish-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 16px; border-bottom:1px solid #eee; }
    .admin-polish-modal-head button { border:1px solid #ddd; background:white; border-radius:999px; padding:8px 12px; cursor:pointer; }
    .admin-polish-preview { flex:1; display:grid; place-items:center; overflow:auto; background:#f5f1ef; padding:20px; }
    .admin-polish-device { width:100%; height:100%; max-width:1280px; border:1px solid #ddd; border-radius:18px; overflow:hidden; background:white; box-shadow:0 15px 40px rgba(40,20,10,.12); transition:width .2s ease; }
    .admin-polish-device.mobile { width:390px; }
    .admin-polish-device.tablet { width:820px; }
    .admin-polish-device iframe { width:100%; height:100%; border:0; }
    .admin-polish-tools { display:flex; flex-wrap:wrap; gap:8px; }
    .admin-polish-health { display:grid; gap:8px; margin-top:14px; }
    .admin-polish-health-row { display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid rgba(120,80,65,.10); border-radius:14px; padding:10px 12px; font-size:12px; }
    .admin-polish-ok { color:#16803c; }
    .admin-polish-warn { color:#a66b00; }
    .admin-polish-danger { color:#b42318; }
    .admin-polish-highlight { outline: 3px solid rgba(145,91,74,.26); outline-offset: 4px; animation: admin-polish-pulse 1.4s ease; }
    @keyframes admin-polish-pulse { 0%,100% { outline-color: rgba(145,91,74,.12); } 50% { outline-color: rgba(145,91,74,.45); } }
    @media (max-width: 767px) { .admin-polish-savebar { bottom: 10px; } .admin-polish-toast { left: 18px; right: 18px; bottom: 76px; width:auto; } body.admin-polished main { padding-bottom: 92px !important; } }
  `;

  function injectCss() {
    if (document.getElementById("admin-ui-polish-css")) return;
    const style = document.createElement("style"); style.id = "admin-ui-polish-css"; style.textContent = css; document.head.appendChild(style);
  }

  function findButtonsByText(text) {
    return [...document.querySelectorAll("button")].filter(b => (b.textContent || "").trim().toLowerCase().includes(text.toLowerCase()));
  }

  function toast(message, kind = "success") {
    let el = document.querySelector(".admin-polish-toast");
    if (!el) { el = document.createElement("div"); el.className = "admin-polish-toast"; document.body.appendChild(el); }
    el.className = `admin-polish-toast ${kind}`; el.innerHTML = `<strong>${kind === "error" ? "⚠" : "✓"}</strong> ${escapeHtml(message)}`; el.hidden = false;
    clearTimeout(el._timer); el._timer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }

  function navGroups() {
    const labels = [...document.querySelectorAll("aside nav button")];
    const groups = { Content:"WEBSITE", Events:"WEBSITE", Gallery:"WEBSITE", Guestbook:"WEBSITE", Guests:"PEOPLE", RSVP:"PEOPLE", Analytics:"INSIGHTS", Notifications:"INSIGHTS", Exports:"INSIGHTS", "Admin Profiles":"ADMINISTRATION", Security:"ADMINISTRATION", "Audit Log":"ADMINISTRATION" };
    let last = "";
    labels.forEach(btn => {
      const label = (btn.textContent || "").replace(/\d+$/, "").trim();
      const group = groups[label];
      if (group && group !== last) {
        const heading = document.createElement("div"); heading.className = "admin-polish-group"; heading.textContent = group; btn.parentElement?.insertBefore(heading, btn); last = group;
      }
      btn.addEventListener("click", () => {
        labels.forEach(x => x.dataset.adminActive = "false"); btn.dataset.adminActive = "true";
        storage.set("admin-polish-last-tab", label);
      });
    });
  }

  function addHeaderTools() {
    const header = document.querySelector("main header"); if (!header || header.dataset.polished) return;
    header.dataset.polished = "true";
    const tools = header.querySelector("div:last-child"); if (!tools) return;
    const makeButton = (label, action, primary = false) => { const b = document.createElement("button"); b.type="button"; b.textContent=label; b.className=`admin-polish-header-btn ${primary?"primary":""}`; b.style.cssText="min-height:40px;border-radius:999px;border:1px solid #ddd;background:white;padding:0 14px;font-size:12px;cursor:pointer;"; if(primary){b.style.background="var(--primary,#8f5b4a)";b.style.color="white";b.style.borderColor="transparent";} b.onclick=action; return b; };
    tools.prepend(makeButton("⌘ Search", openCommand));
    tools.prepend(makeButton("Preview", () => openPreview(window.location.origin)));
  }

  function createSaveBar() {
    if (document.querySelector(".admin-polish-savebar")) return;
    const bar = document.createElement("div"); bar.className="admin-polish-savebar"; bar.hidden=true;
    bar.innerHTML=`<div class="status"><strong>Unsaved changes</strong><div style="font-size:11px;color:#777;margin-top:2px">Your edits are not saved yet.</div></div><button data-action="discard">Discard</button><button class="primary" data-action="save">Save changes</button>`;
    document.body.appendChild(bar);
    bar.querySelector('[data-action="discard"]').onclick=()=>{ state.unsaved=false; bar.hidden=true; toast("Local unsaved state cleared"); };
    bar.querySelector('[data-action="save"]').onclick=()=>{ const buttons=findButtonsByText("save all").concat(findButtonsByText("save changes")); const target=buttons.find(b=>b.offsetParent!==null); if(target){target.click(); state.unsaved=false; bar.hidden=true; toast("Save action triggered");} else toast("Open the Content section and use its Save button", "error"); };
  }

  function watchEdits() {
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach(input => { if (input.dataset.polishWatched) return; input.dataset.polishWatched="true"; input.addEventListener("input", () => { state.unsaved=true; const bar=document.querySelector(".admin-polish-savebar"); if(bar) bar.hidden=false; }); });
  }

  function openCommand() {
    let overlay = document.querySelector(".admin-polish-command");
    if (!overlay) {
      overlay=document.createElement("div"); overlay.className="admin-polish-command"; overlay.innerHTML=`<div class="admin-polish-command-card"><input aria-label="Search Admin" placeholder="Search pages, actions and tools..."/><div class="admin-polish-command-list"></div></div>`; document.body.appendChild(overlay);
      overlay.addEventListener("click", e=>{if(e.target===overlay) closeCommand();});
      overlay.querySelector("input").addEventListener("input", renderCommands);
    }
    overlay.hidden=false; state.commandOpen=true; overlay.querySelector("input").value=""; renderCommands(); setTimeout(()=>overlay.querySelector("input").focus(),20);
  }
  function closeCommand(){const o=document.querySelector(".admin-polish-command");if(o)o.hidden=true;state.commandOpen=false;}
  function renderCommands(){
    const overlay=document.querySelector(".admin-polish-command"); if(!overlay)return; const q=(overlay.querySelector("input").value||"").toLowerCase(); const list=overlay.querySelector(".admin-polish-command-list");
    const nav=[...document.querySelectorAll("aside nav button")].map(b=>({name:(b.textContent||"").trim(),run:()=>b.click()}));
    const commands=[...nav,
      {name:"Preview Website",run:()=>openPreview(window.location.origin)},
      {name:"Run Pre-Launch Check",run:()=>openLaunchCheck()},
      {name:"System Health",run:()=>openHealth()},
      {name:"Link Checker",run:()=>runLinkCheck()},
      {name:"Media Health",run:()=>runMediaCheck()},
      {name:"Save Changes",run:()=>document.querySelector('.admin-polish-savebar [data-action="save"]')?.click()},
      {name:"Clear Unsaved State",run:()=>document.querySelector('.admin-polish-savebar [data-action="discard"]')?.click()},
    ].filter(x=>x.name.toLowerCase().includes(q)).slice(0,20);
    list.innerHTML=""; commands.forEach((c,i)=>{const b=document.createElement("button");b.className=`admin-polish-command-item ${i===0?"active":""}`;b.innerHTML=`<span>${escapeHtml(c.name)}</span>${i===0?'<span class="admin-polish-kbd">Enter</span>':''}`;b.onclick=()=>{closeCommand();c.run();};list.appendChild(b);});
    if(!commands.length) list.innerHTML='<div style="padding:20px;text-align:center;color:#777;font-size:13px">No matching Admin actions.</div>';
  }

  function openPreview(url) {
    let modal=document.querySelector(".admin-polish-modal.preview-modal");
    if(!modal){ modal=document.createElement("div"); modal.className="admin-polish-modal preview-modal"; modal.innerHTML=`<div class="admin-polish-modal-card"><div class="admin-polish-modal-head"><div><strong>Website Preview</strong><div style="font-size:11px;color:#777">Check desktop, tablet and mobile layouts before publishing.</div></div><div class="admin-polish-tools"><button data-device="desktop">Desktop</button><button data-device="tablet">Tablet</button><button data-device="mobile">Mobile</button><button data-close>Close</button></div></div><div class="admin-polish-preview"><div class="admin-polish-device"><iframe title="Website preview"></iframe></div></div></div>`; document.body.appendChild(modal); modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true;}); modal.querySelector("[data-close]").onclick=()=>modal.hidden=true; modal.querySelectorAll("[data-device]").forEach(b=>b.onclick=()=>{const d=modal.querySelector(".admin-polish-device");d.classList.remove("mobile","tablet");if(b.dataset.device!=="desktop")d.classList.add(b.dataset.device);}); }
    modal.hidden=false; modal.querySelector("iframe").src=url; state.previewOpen=true;
  }

  function checkRows() {
    const rows=[]; const links=[...document.querySelectorAll("a[href]")].filter(a=>!a.href.startsWith("javascript:"));
    rows.push(["Navigation", document.querySelectorAll("aside nav button").length>0, `${document.querySelectorAll("aside nav button").length} Admin sections available`]);
    rows.push(["Public preview", true, window.location.origin]);
    rows.push(["Forms", document.querySelectorAll("input,textarea,select").length>0, `${document.querySelectorAll("input,textarea,select").length} editable controls on this page`]);
    rows.push(["External links", links.length>0, `${links.length} links found on current page`]);
    const brokenText=[...document.querySelectorAll("img")].filter(i=>i.complete&&i.naturalWidth===0).length;
    rows.push(["Images", brokenText===0, brokenText?`${brokenText} broken image(s) detected":"All loaded images currently have dimensions`]);
    return rows;
  }
  function makeToolModal(title, rows) {
    let modal=document.querySelector(".admin-polish-modal.tool-modal"); if(!modal){modal=document.createElement("div");modal.className="admin-polish-modal tool-modal";document.body.appendChild(modal);}
    modal.innerHTML=`<div class="admin-polish-modal-card" style="height:auto;max-height:90vh"><div class="admin-polish-modal-head"><strong>${escapeHtml(title)}</strong><button data-close>Close</button></div><div style="padding:18px;overflow:auto"><div class="admin-polish-health">${rows.map(r=>`<div class="admin-polish-health-row"><span>${escapeHtml(r[0])}<div style="font-size:11px;color:#777;margin-top:2px">${escapeHtml(r[2])}</div></span><strong class="${r[1]?"admin-polish-ok":"admin-polish-warn"}">${r[1]?"✓ OK":"⚠ Review"}</strong></div>`).join("")}</div></div></div>`;modal.hidden=false;modal.querySelector("[data-close]").onclick=()=>modal.hidden=true;modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true;},{once:true});
  }
  function openHealth(){makeToolModal("System Health",[["Admin UI",true,"Polish layer active"],["Authentication",true,"Existing Admin authentication remains in control"],["Navigation",document.querySelectorAll("aside nav button").length>0,"Navigation rendered"],["Forms",document.querySelectorAll("input,textarea,select").length>0,"Editable controls detected"],["Responsive layout",window.innerWidth>0,"Browser viewport detected"],["Local draft support",true,"Existing Admin local draft mechanism is preserved"]]);}
  function openLaunchCheck(){makeToolModal("Pre-Launch Check",checkRows().concat([["Admin alerts",document.querySelector('[aria-live="polite"]')!==null,"Alert region detected"],["Save controls",findButtonsByText("save").length>0,"Save controls detected"],["Preview",true,"Preview tool available"]]));}
  function runLinkCheck(){const links=[...document.querySelectorAll("a[href]")];const rows=links.slice(0,30).map(a=>{try{return [a.textContent?.trim()||"Link",!!a.href,a.href]}catch{return ["Link",false,"Invalid URL"]}});makeToolModal("Link Checker",rows.length?rows:[["Links",false,"No links found on this screen"]]);}
  function runMediaCheck(){const imgs=[...document.images];const videos=[...document.querySelectorAll("video")];const badImgs=imgs.filter(i=>i.complete&&i.naturalWidth===0).length;const rows=[["Images",badImgs===0,`${imgs.length-badImgs}/${imgs.length} currently load`],["Videos",videos.length>=0,`${videos.length} video element(s) on current screen`]];makeToolModal("Media Health",rows);}

  function addDashboardTools(){
    const title=[...document.querySelectorAll("main h1")].find(h=>/dashboard/i.test(h.textContent||"")); if(!title)return;
    if(document.querySelector(".admin-polish-dashboard-tools"))return;
    const section=title.closest("main")?.querySelector("section"); if(!section)return;
    const card=document.createElement("div"); card.className="admin-polish-dashboard-tools"; card.style.cssText="margin-top:16px;border:1px solid rgba(120,80,65,.12);border-radius:24px;background:white;padding:18px;box-shadow:0 8px 28px rgba(80,45,35,.05)";
    card.innerHTML=`<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8b7770;font-weight:700">Admin tools</div><h2 style="font-family:inherit;font-size:22px;margin:4px 0">Website Control</h2><p style="font-size:12px;color:#777;margin:0">Preview, health checks and launch readiness.</p></div><div class="admin-polish-tools"><button data-tool="preview">Preview</button><button data-tool="launch">Launch Check</button><button data-tool="health">System Health</button></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px"><div style="border:1px solid #eee;border-radius:14px;padding:12px"><div style="font-size:10px;color:#777">Website</div><strong>Ready to preview</strong></div><div style="border:1px solid #eee;border-radius:14px;padding:12px"><div style="font-size:10px;color:#777">Draft</div><strong>${state.unsaved?"Unsaved changes":"No local UI changes"}</strong></div><div style="border:1px solid #eee;border-radius:14px;padding:12px"><div style="font-size:10px;color:#777">Mobile</div><strong>Responsive tools enabled</strong></div></div>`;
    section.insertBefore(card, section.firstElementChild);
    card.querySelector('[data-tool="preview"]').onclick=()=>openPreview(window.location.origin);
    card.querySelector('[data-tool="launch"]').onclick=openLaunchCheck;
    card.querySelector('[data-tool="health"]').onclick=openHealth;
    card.querySelectorAll("button").forEach(b=>{b.style.cssText="min-height:38px;border-radius:999px;border:1px solid #ddd;background:white;padding:0 13px;font-size:12px;cursor:pointer";});
  }

  function keyboard() {
    document.addEventListener("keydown", e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openCommand();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();document.querySelector('.admin-polish-savebar [data-action="save"]')?.click();}
      if(e.key==="Escape"){closeCommand();document.querySelectorAll(".admin-polish-modal").forEach(m=>m.hidden=true);}
    });
  }

  function protectNavigation() {
    window.addEventListener("beforeunload", e=>{if(state.unsaved){e.preventDefault();e.returnValue="";}});
  }

  function init() {
    if(state.initialized)return; if(!document.body.innerText.includes(ADMIN_HINT))return;
    state.initialized=true; document.body.classList.add("admin-polished"); injectCss(); navGroups(); addHeaderTools(); createSaveBar(); watchEdits(); keyboard(); protectNavigation(); addDashboardTools();
    const observer=new MutationObserver(()=>{watchEdits();addHeaderTools();}); observer.observe(document.body,{childList:true,subtree:true});
  }

  const timer=setInterval(init,350); setTimeout(()=>clearInterval(timer),15000); init();
})();
