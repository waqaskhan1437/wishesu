import "./Dropzone.css";

export function Dropzone({ title, note, accept, onPick }) {
  const el = document.createElement("div");
  el.className = "drop";

  const left = document.createElement("div");
  const t = document.createElement("strong");
  t.textContent = title || "Upload";
  const n = document.createElement("div");
  n.className = "small";
  n.textContent = note || "";
  left.appendChild(t);
  left.appendChild(n);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept || "*/*";
  input.style.display = "none";
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (f) onPick?.(f);
  });

  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Choose file";
  btn.addEventListener("click", () => input.click());

  el.appendChild(left);
  el.appendChild(btn);
  el.appendChild(input);
  return el;
}
