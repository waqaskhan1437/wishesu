export function skeleton(lines = 6) {
  const wrap = document.createElement("div");
  wrap.className = "skel";
  for (let i = 0; i < lines; i++) {
    const bar = document.createElement("div");
    bar.className = "skel-bar";
    wrap.appendChild(bar);
  }
  return wrap;
}
