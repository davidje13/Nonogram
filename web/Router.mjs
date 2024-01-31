export class Router {
  constructor(container, routes) {
    this.container = container;
    this.routes = routes;
    this.hash = null;
    this.active = null;

    this.update = this.update.bind(this);

    window.addEventListener('hashchange', this.update);
    this.update();
  }

  update() {
    const hash = window.location.hash.substring(1);
    if (hash === this.hash) {
      return;
    }
    try {
      this.active?.unmount?.();
    } catch (e) {
      console.warn(e);
    }
    this.active?.element?.remove();
    this.hash = hash;
    this.active = null;
    const params = Object.fromEntries(new URLSearchParams(hash).entries());
    for (const route of this.routes) {
      const r = route(params);
      if (r) {
        this.container.append(r.element);
        this.active = r;
        document.title = r.title;
        return;
      }
    }
  }

  makeLink(params, full) {
    const prefix = full ? window.location.href.split('#')[0] : '';
    return `${prefix}#${new URLSearchParams(params)}`;
  }

  go(params, updateUI = true) {
    const hash = this.makeLink(params);
    if (this.hash === hash) {
      return;
    }
    if (!updateUI) {
      this.hash = hash;
    }
    window.location.href = hash;
  }
}
