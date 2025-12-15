export class Connector {
  #tabs = [];
  registerTab(tab) { this.#tabs.push(tab); }
  getTabs() { return [...this.#tabs]; }
}
