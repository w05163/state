// vue
import type { Ref } from '@vue/reactivity';
import { onBeforeUnmount, ref } from 'vue';
import State from '../core/state';
import {
  ActionKeys,
  CreateStore,
  VueComputed,
  VueRefMap,
} from '../types/helper';

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
  K extends ActionKeys<S1>
>(
  store: S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
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

  const methods = {} as Pick<S1, K>;
  actionKeys?.forEach((k) => {
    methods[k] = (store[k] as Function).bind(store);
  });
  onBeforeUnmount(off);
  return {
    ...refMap,
    ...methods,
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
  K extends ActionKeys<S1>,
  ID
>(
  createStore: [CreateStore<S1, ID>, ID?] | S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
) {
  const methods = {} as Pick<S1, K>;
  const computed = {} as VueComputed<S>;

  const dataKey = Symbol('data');
  const offKey = Symbol('off');
  const storeKey = Symbol('storeKey');

  type Vm = { [dataKey]: S; [offKey]?: Function; [storeKey]: S1 };

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
      actionKeys?.forEach((k) => {
        methods[k] = (store[k] as Function).bind(store);
      });
      Object.keys(vm[dataKey]).forEach((i) => {
        const k = i as keyof S;
        computed[k] = function (this: { [dataKey]: S }) {
          return this[dataKey][k];
        };
      });
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
