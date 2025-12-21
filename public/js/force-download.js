
document.addEventListener("click", async function(e) {
  const btn = e.target.closest(".download-btn");
  if (!btn) return;

  e.preventDefault();
  const url = btn.getAttribute("href") || btn.dataset.url;
  if (!url) return;

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = url.split("/").pop().split("?")[0];
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("Download failed", err);
  }
});
