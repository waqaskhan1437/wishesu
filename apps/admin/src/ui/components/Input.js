import "./Input.css";

export function Input({ label, value, placeholder, onInput, help }) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label || "";

  const i = document.createElement("input");
  i.className = "input";
  i.value = value || "";
  i.placeholder = placeholder || "";
  i.addEventListener("input", () => onInput?.(i.value));

  wrap.appendChild(l);
  wrap.appendChild(i);

  if (help) {
    const h = document.createElement("div");
    h.className = "help";
    h.textContent = help;
    wrap.appendChild(h);
  }
  return wrap;
}

export function Textarea({ label, value, placeholder, onInput, help }) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label || "";

  const t = document.createElement("textarea");
  t.className = "textarea";
  t.value = value || "";
  t.placeholder = placeholder || "";
  t.addEventListener("input", () => onInput?.(t.value));

  wrap.appendChild(l);
  wrap.appendChild(t);

  if (help) {
    const h = document.createElement("div");
    h.className = "help";
    h.textContent = help;
    wrap.appendChild(h);
  }
  return wrap;
}
