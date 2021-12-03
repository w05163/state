// vue
import type { Ref } from '@vue/reactivity';
import { onBeforeUnmount, ref } from 'vue';
import State from '../core/state';
import type {
  Action,
  ActionKeys,
  ActionKeysMap,
  CreateStore,
  VueComputed,
  VueRefMap,
} from '../types/helper';
import { makeActions } from '../utils/index';

/**
 * 组合式注入
 * @param store
 * @param handler
 * @param actionKeys
 * @returns
 */
export function setupStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeysMap<S1>
>(
  store: S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K
) {
  const state = handler(store.$getState());
  const refMap = {} as VueRefMap<S>;
  Object.keys(state).forEach((k) => {
    const stateKey = k as keyof S;
    refMap[stateKey] = ref(state[stateKey]) as Ref<S[keyof S]>;
  });
  // 监听状态变化
  const off = store.$watch((newVal) => {
    const newState = handler(newVal);
    Object.keys(newState).forEach((k) => {
      const stateKey = k as keyof S;
      if (!refMap[stateKey]) return;
      refMap[stateKey].value = newState[stateKey];
    });
  });

  const actions = makeActions(store, actionKeys);

  onBeforeUnmount(off);
  return {
    ...refMap,
    ...actions,
  };
}

/**
 * 选项式注入
 * @param store
 * @param handler
 * @param actionKeys
 * @returns
 */
export function bindStoreMixin<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeysMap<S1>,
  ID
>(
  createStore: [CreateStore<S1, ID>, ID?] | S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  stateKeys: (keyof S)[],
  actionKeys?: K
) {
  const methods = {} as Action<S1, K>;
  const computed = {} as VueComputed<S>;

  const dataKey = Symbol('data');
  const offKey = Symbol('off');
  const storeKey = Symbol('storeKey');

  type Vm = { [dataKey]: S; [offKey]?: Function; [storeKey]: S1 };

  stateKeys.forEach((i) => {
    const k = i as keyof S;
    computed[k] = function (this: { [dataKey]: S }) {
      return this[dataKey][k];
    };
  });
  function makeProxyFunc(
    k: ActionKeys<S1>
  ): Action<S1, K>[keyof Action<S1, K>] {
    return function (this: any, ...args: any[]) {
      const vm = this as unknown as Vm;
      const store = vm[storeKey];
      return (store[k] as unknown as Function).call(store, ...args);
    } as unknown as Action<S1, K>[keyof Action<S1, K>];
  }
  if (actionKeys) {
    if (Array.isArray(actionKeys)) {
      actionKeys?.forEach((k) => {
        const key = k as keyof Action<S1, K>;
        methods[key] = makeProxyFunc(k);
      });
    } else {
      Object.entries(actionKeys).forEach(([funName, key]) => {
        const fName = funName as keyof Action<S1, K>;
        methods[fName] = makeProxyFunc(key);
      });
    }
  }

  return {
    beforeCreate() {
      const vm = this as unknown as Vm;
      let store = null;
      if (Array.isArray(createStore)) {
        const [create, storeId] = createStore;
        store = create(storeId);
      } else store = createStore;
      vm[storeKey] = store;
    },
    data(): {} {
      const vm = this as unknown as Vm;
      const store = vm[storeKey];
      return {
        [dataKey]: handler(store.$getState()),
      };
    },
    created() {
      const vm = this as unknown as Vm;
      const store = vm[storeKey] as S1;
      // 监听状态变化
      vm[offKey] = store.$watch((newVal) => {
        const newData = handler(newVal);
        Object.assign(vm[dataKey], newData);
      });
    },
    beforeDestroy() {
      const vm = this as unknown as Vm;
      const off = vm[offKey];
      if (off) off();
    },
    computed,
    methods,
    $keyMap: {
      dataKey,
      offKey,
      storeKey,
    },
  };
}
