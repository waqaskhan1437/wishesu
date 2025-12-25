/**
 * Settings content helpers.
 */

export function renderPlaceholder(content, title, message) {
  content.innerHTML = `
    <div class="settings-form">
      <h3>${title}</h3>
      <p>${message}</p>
      <p class="text-muted">Coming soon...</p>
    </div>
  `;
}
