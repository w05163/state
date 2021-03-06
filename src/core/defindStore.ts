/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable import/export */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CreateStore, FullState, Getter, Mode, Mutations } from './state';
import State from './state';

/** ---------------------- */

type LengthStoreArray = [CreateStore, number];
type AsyncStoreArray = [CreateStore, 'async'];

export type ChildrenOpt = {
  [key: string]: CreateStore | LengthStoreArray | AsyncStoreArray;
};

type ChildrenIns<Opt> = Opt extends CreateStore
  ? ReturnType<Opt>
  : Opt extends LengthStoreArray | AsyncStoreArray
  ? Array<ReturnType<Opt[0]>>
  : never;

type ChildrenObj<C extends ChildrenOpt> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof C]: ChildrenIns<C[K]>;
};

// eslint-disable-next-line @typescript-eslint/ban-types
type Actions = Record<string, Function>;

interface DefindOption<
  S,
  C extends ChildrenOpt,
  G extends Getter<FullState<S, ChildrenObj<C>>>,
  A,
  M extends Mutations<S, FullState<S, ChildrenObj<C>, G>>,
  K extends Record<string, string>
> {
  state: () => S;
  getter?: G;
  store?: C;
  setup?: () => void | (() => void);
  actions?: A & ThisType<State<S, ChildrenObj<C>, G, M> & A>;
  mutations?: M & ThisType<null>;
  keys?: K;
}

/** ---------------------- */

export default function defindStore<
  S,
  C extends ChildrenOpt,
  G extends Getter<FullState<S, ChildrenObj<C>>>,
  M extends Mutations<S, FullState<S, ChildrenObj<C>, G>>,
  K extends Record<string, string>,
  A extends Actions = {}
>(defindOption: DefindOption<S, C, G, A, M, K>) {
  const {
    state,
    getter = {},
    store = {} as ChildrenOpt,
    setup,
    actions = {},
    mutations,
  } = defindOption;
  const childrenIns = {} as ChildrenObj<C>;
  Object.entries(store).forEach(([k, ch]) => {
    const key = k as keyof C;
    if (typeof ch === 'function') {
      childrenIns[key] = ch() as ChildrenIns<C[keyof C]>;
    } else if (Array.isArray(ch)) {
      const [createStore, type] = ch;
      if (typeof type === 'number') {
        childrenIns[key] = Array(type)
          .fill(createStore)
          .map((func) => func()) as ChildrenIns<C[keyof C]>;
      } else {
        childrenIns[key] = [] as ChildrenIns<C[keyof C]>;
      }
    }
  });

  type SC = State<S, ChildrenObj<C>, G, M> & A;

  class StoreClass extends State<S, ChildrenObj<C>, G, M> {
    constructor(id: string, mode?: Mode) {
      super({
        state: state(),
        getter: getter as G,
        store: childrenIns,
        id,
        mutations,
        mode,
      });
    }
  }
  StoreClass.prototype = Object.assign(StoreClass.prototype, actions);

  const tempPrefix = `$$temp_id_${Math.random().toString()}`;
  let count = 0;
  const getStore = function (id?: keyof K) {
    let mapId = id?.toString();
    let mode: Mode = 'root';

    if (!mapId) mapId = `${tempPrefix}${++count}`;
    if (mapId.startsWith(tempPrefix)) mode = 'temp';

    const ins = new StoreClass(mapId, mode) as SC;
    if (setup) {
      const clearUp = setup.call(ins);
      if (clearUp) ins.addClearTask(clearUp);
    }
    return ins;
  };

  getStore.StoreClass = StoreClass as new (
    id: string,
    mode?: Mode | undefined
  ) => SC;
  getStore.option = defindOption;
  return getStore;
}
