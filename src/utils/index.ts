import type State from '../core/state';
import type { Action, ActionKeysMap } from '../types/helper';

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

export function makeActions<
  S1 extends State<any, any, any, any>,
  K extends ActionKeysMap<S1>
>(store: S1, actionKeys?: K) {
  const actions = {} as Action<S1, K>;

  if (actionKeys) {
    if (Array.isArray(actionKeys)) {
      actionKeys?.forEach((k) => {
        const key = k as keyof Action<S1, K>;
        actions[key] = (store[k] as unknown as Function).bind(store);
      });
    } else {
      Object.entries(actionKeys).forEach(([funName, key]) => {
        const fName = funName as keyof Action<S1, K>;
        actions[fName] = (store[key] as unknown as Function).bind(store);
      });
    }
  }
  return actions;
}
