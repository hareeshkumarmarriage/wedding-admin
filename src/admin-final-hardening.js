(() => {
  const isAdmin = () => window.location.pathname.startsWith("/admin");
  if (!isAdmin()) return;

  const textOf = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

  const syncIntroDriveField = () => {
    const labels = Array.from(document.querySelectorAll("label"));
    const toggleLabel = labels.find((label) => textOf(label).includes("show intro video"));
    const driveLabel = labels.find((label) => textOf(label).includes("intro video drive id"));
    const toggle = toggleLabel?.querySelector('input[type="checkbox"]');
    const driveInput = driveLabel?.querySelector("input");
    if (!toggle || !driveInput) return;

    const disabled = !toggle.checked;
    driveInput.disabled = disabled;
    driveInput.setAttribute("aria-disabled", String(disabled));
    driveInput.classList.toggle("opacity-50", disabled);
    driveInput.classList.toggle("cursor-not-allowed", disabled);
  };

  const preserveScrollOnSave = (event) => {
    const target = event.target?.closest?.("button");
    if (!target) return;
    const label = textOf(target);
    if (!/(save|publish|reset)/.test(label)) return;

    const y = window.scrollY;
    const restore = () => window.scrollTo({ top: y, left: 0, behavior: "auto" });
    requestAnimationFrame(restore);
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 250);
    window.setTimeout(restore, 700);
  };

  document.addEventListener("click", preserveScrollOnSave, true);
  syncIntroDriveField();

  const observer = new MutationObserver(() => syncIntroDriveField());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["checked", "value", "open"] });

  window.setInterval(syncIntroDriveField, 1000);
})();
