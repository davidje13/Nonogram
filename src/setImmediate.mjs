const messages = new Map();

const channel = new MessageChannel();
channel.port2.onmessage = () => {
  const fns = [...messages.values()];
  messages.clear();
  for (const fn of fns) {
    fn();
  }
};

export function setImmediate(fn) {
  const id = {};
  messages.set(id, fn);
  channel.port1.postMessage(1);
  return id;
}

export function clearImmediate(id) {
  messages.delete(id);
}
