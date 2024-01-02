export const debounce = (fn, delay) => {
  let tm = null;
  const wrapped = (...args) => {
    if (tm) {
      clearTimeout(tm);
    }
    tm = setTimeout(() => {
      tm = null;
      fn(...args);
    }, delay);
  };
  wrapped.cancel = () => {
    if (tm) {
      clearTimeout(tm);
      tm = null;
    }
  };
  wrapped.immediate = () => {
    if (tm) {
      clearTimeout(tm);
      tm = null;
      fn(...args);
    }
  };
  return wrapped;
};
