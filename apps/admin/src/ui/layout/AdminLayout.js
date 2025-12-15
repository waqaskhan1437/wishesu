import "./AdminLayout.css";
import { Input } from "../components/Input.js";

export function AdminLayout() {
  const el = document.createElement("div");
  el.className = "container";

  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "top";

  const brand = document.createElement("div");
  brand.className = "brand";
  const b1 = document.createElement("strong");
  b1.textContent = "Admin Panel";
  const b2 = document.createElement("span");
  b2.textContent = "Products · Media · Addons · SEO";
  brand.appendChild(b1);
  brand.appendChild(b2);

  const actions = document.createElement("div");
  actions.className = "actions";
  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = "Not logged in";
  const logoutBtn = document.createElement("button");
  logoutBtn.className = "btn";
  logoutBtn.textContent = "Logout";
  logoutBtn.style.display = "none";

  actions.appendChild(badge);
  actions.appendChild(logoutBtn);

  top.appendChild(brand);
  top.appendChild(actions);

  const page = document.createElement("div");
  page.className = "page";

  card.appendChild(top);
  card.appendChild(page);
  el.appendChild(card);

  let onLoginCb = null;
  let onLogoutCb = null;
  let errEl = null;

  function showError(msg) {
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.className = "err";
      page.appendChild(errEl);
    }
    errEl.textContent = msg;
  }

  function clearError() {
    if (errEl) errEl.remove();
    errEl = null;
  }

  function showLogin() {
    badge.textContent = "Not logged in";
    logoutBtn.style.display = "none";
    page.innerHTML = "";

    const box = document.createElement("div");
    box.className = "card login";

    const title = document.createElement("div");
    title.className = "h1";
    title.textContent = "Login";

    const email = Input({ label: "Email", placeholder: "owner@example.com" });
    const pass = Input({ label: "Password", placeholder: "••••••••" });
    pass.querySelector("input").type = "password";

    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = "Sign in";

    btn.addEventListener("click", () => {
      const e = email.querySelector("input").value.trim();
      const p = pass.querySelector("input").value;
      onLoginCb?.(e, p);
    });

    box.appendChild(title);
    box.appendChild(email);
    box.appendChild(pass);
    box.appendChild(btn);
    page.appendChild(box);
  }

  function showPage(view) {
    badge.textContent = "Logged in";
    logoutBtn.style.display = "inline-flex";
    page.innerHTML = "";
    page.appendChild(view);
  }

  logoutBtn.addEventListener("click", () => onLogoutCb?.());

  return {
    el,
    onLogin(cb) { onLoginCb = cb; },
    onLogout(cb) { onLogoutCb = cb; },
    showLogin,
    showPage,
    showError,
    clearError,
  };
}
