export function el(tag, attributes = {}, children = []) {
  const o = document.createElement(tag);
  for (const [k, v] of Object.entries(attributes)) {
    o.setAttribute(k, v);
  }
  o.append(...children);
  return o;
}

export function makeButton(text, fn) {
  const btn = el('button', { type: 'button' }, [text]);
  btn.addEventListener('click', fn);
  return btn;
}
