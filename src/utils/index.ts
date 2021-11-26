/**
 * 微任务防抖
 * @param func
 * @param args
 */
export function microDebounce<T extends Array<any>>(
  func: (...args: T) => void
) {
  let lastArgs: T = [] as unknown as T;
  let flag = false;
  return function debounceFunc(...args: T) {
    lastArgs = args;
    if (flag) return;
    flag = true;
    Promise.resolve().then(() => {
      flag = false;
      func(...lastArgs);
    });
  };
}
