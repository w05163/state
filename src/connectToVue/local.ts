// vue
import { inject, provide } from 'vue';
import State from '../core/state';
import { ActionKeys, CreateStore, FuncThis } from '../types/helper';
import { bindStoreMixin, setupStore } from './global';

const contextMap = new Map<Function, string>();

/**
 * 获取store对应的provide key，如果没有，将会创建一个
 * @param createStore
 * @returns
 */
export function getProvideKey<S1>(createStore: CreateStore<S1>) {
  if (contextMap.has(createStore)) return contextMap.get(createStore) as string;
  const context = Math.random().toString();
  contextMap.set(createStore, context);
  return context;
}

/**
 * 组合式注入局部store
 * @param store
 * @param handler
 * @param actionKeys
 * @returns
 */
export function setupLocalStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
) {
  const store = createStore();
  const setupData = setupStore(store, handler, actionKeys);
  provide(getProvideKey(createStore), store);
  return {
    ...setupData,
  };
}

/**
 * 选项式注入局部store
 * @param store
 * @param handler
 * @param actionKeys
 * @returns
 */
export function bindLocalStoreMixin<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  stateKeys: (keyof S)[],
  actionKeys?: K[]
) {
  const options = bindStoreMixin([createStore], handler, stateKeys, actionKeys);
  const newOptions = {
    ...options,
    provide(this: Record<symbol, S1>) {
      return {
        [getProvideKey(createStore)]: this[options.$keyMap.storeKey],
      };
    },
  };
  return newOptions;
}

/**
 * 注入通过Provide提供的store
 * @param createStore
 * @param handler
 * @param actionKeys
 * @returns
 */
export function setupInjectStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
) {
  const store = inject(getProvideKey(createStore)) as S1;
  const setupData = setupStore(store, handler, actionKeys);
  return {
    ...setupData,
  };
}

/**
 * 注入通过Provide提供的store
 * @param createStore
 * @param handler
 * @param actionKeys
 * @returns
 */
export function bindInjectStoreMixin<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  stateKeys: (keyof S)[],
  actionKeys?: K[]
) {
  const options = bindStoreMixin([createStore], handler, stateKeys, actionKeys);
  const { beforeCreate, ...opt } = options;
  type Vm = Record<symbol | string, S1>;

  const newOptions = {
    ...opt,
    data(this: Vm) {
      this[opt.$keyMap.storeKey] = this[getProvideKey(createStore)];
      return opt.data.call(this as unknown as FuncThis<typeof opt.data>);
    },
    inject: [getProvideKey(createStore)],
  };
  return newOptions;
}
