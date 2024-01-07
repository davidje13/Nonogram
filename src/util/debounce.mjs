export const debounce = (fn, delay) => {
  let tm = null;
  let run = null;
  const wrapped = (...args) => {
    if (tm) {
      clearTimeout(tm);
    }
    run = () => {
      tm = null;
      run = null;
      fn(...args);
    };
    tm = setTimeout(run, delay);
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
      run();
    }
  };
  return wrapped;
};
