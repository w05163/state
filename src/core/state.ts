/* eslint-disable no-param-reassign */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-explicit-any */
// 状态容器祖类

import getSpace from './stateSpace';

type IsArrKey<A, K> = A extends Array<any> ? K : never;

type ChildrenArrayKeys<T> = {
  [K in keyof T]: IsArrKey<T[K], K>;
}[keyof T];

export type Mode = 'root' | 'temp';

interface InitOption<S, C, G, M> {
  id: string;
  state: S;
  children?: C;
  getter?: G;
  mutations?: M;
  mode?: Mode;
}

export type Getter<FS> = {
  [key: string]: (state: FS) => any;
};
export type GetterState<G extends Getter<any>> = Readonly<
  {
    [K in keyof G]: ReturnType<G[K]>;
  }
>;
export type GetterProps<G extends Getter<any>> = {
  [K in keyof G]: {
    get: () => ReturnType<G[K]>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Children = {
  [key: string]:
    | State<any, Children, any, any>
    | Array<State<any, Children, any, any>>;
};

export type CreateStore<
  S extends State<any, Children, any, any> = State<any, Children, any, any>
> = (id?: string) => S;

export type StateType<S> = S extends State<any, Children, any, any>
  ? ReturnType<S['$getState']>
  : S extends Array<State<any, Children, any, any>>
  ? Array<ReturnType<S[0]['$getState']> | undefined>
  : null;

export type ChildrenState<C extends Children> = {
  [K in keyof C]: StateType<C[K]>;
};

export type FullState<
  S,
  C extends Children,
  G extends Getter<FullState<S, C>> = {}
> = S & ChildrenState<C> & { $get: GetterState<G> };

export type Mutations<S, State> = Record<
  string,
  (state: State, ...args: any) => Partial<S>
>;

type MutationArgs<M> = M extends (state: any, ...args: infer A) => any
  ? A
  : never;

/** State实现 ---------------------------------------------- */

/**
 * 状态管理类
 */
export default class State<
  S,
  C extends Children,
  G extends Getter<FullState<S, C>>,
  M extends Mutations<S, FullState<S, C, G>>
> {
  /** 状态数据 */
  protected state: S = {} as S;

  /** 旧数据 */
  private lastFullState!: FullState<S, C, G>;

  /** 唯一id */
  public id = '';

  public mutations: M = {} as M;

  public getter: GetterState<G> = {} as GetterState<G>;

  /** 缓存的getter结果，每次commit之后会置空 */
  private getterCache: Partial<GetterState<G>> = {};

  /** 所依赖的子State */
  public children: C = {} as C;

  /** 子State的状态 */
  protected childrenState: ChildrenState<C> = {} as ChildrenState<C>;

  /** 监听者回调 */
  private handlers: ((
    newVal: FullState<S, C, G>,
    oldVal: FullState<S, C, G>
  ) => void)[] = [];

  /** 销毁前需执行的清理任务 */
  private clearTasks: (() => void)[] = [];

  /**
   * 运行模式，temp模式下，当无监听者时，会执行清理工作，销毁自身
   */
  private mode: Mode = 'root';

  constructor({
    id,
    state,
    getter,
    children,
    mutations,
    mode = 'root',
  }: InitOption<S, C, G, M>) {
    const space = getSpace(this.constructor);
    if (space.has(id)) return space.get(id);

    this.getter = this.$$createGetterState(getter);
    this.getterCache = {};
    this.children = (children ?? {}) as C;
    this.state = state;
    this.childrenState = this.$$initChildrenState(children);
    this.handlers = [];
    this.clearTasks = [];
    this.id = id;
    this.mutations = mutations ?? ({} as M);
    this.mode = mode;
    this.lastFullState = this.$getState();
    space.set(id, this);
  }

  // 广播更新
  private $$publish() {
    const { handlers } = this;
    handlers.forEach((callback) => {
      try {
        callback(this.$getState(), this.lastFullState);
      } catch (error) {
        this.$$onError(error);
      }
    });
  }

  /** 提交变更 */
  public $commit<K extends keyof M>(
    mutationKey: K,
    ...args: MutationArgs<M[K]>
  ) {
    this.lastFullState = this.$getState();
    const mutation = this.mutations[mutationKey];
    const newState = mutation(this.$getState(), ...(args as any[]));
    const nextState = { ...this.state };
    // eslint-disable-next-line no-restricted-syntax
    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(nextState, key)) {
        nextState[key] = newState[key] as S[Extract<keyof S, string>];
      }
    }
    this.state = nextState;
    this.$$publish();
  }

  /**
   * 监听state变化
   * @param handler
   * @returns
   */
  public $watch(
    handler: (newVal: FullState<S, C, G>, oldVal: FullState<S, C, G>) => void
  ) {
    const index = this.handlers.length;
    this.handlers.push(handler);
    return () => {
      this.handlers.splice(index, 1);
      if (this.$$needClearUp()) this.$$clearUp();
    };
  }

  /** 获取状态 */
  public $getState() {
    return { ...this.state, ...this.childrenState, $get: this.getter };
  }

  /**
   * 添加一个清理函数
   * @param task 清理函数
   */
  public $addClearTask(task: () => void) {
    if (this.clearTasks.includes(task)) return;
    this.clearTasks.push(task);
  }

  /**
   * 给异步数组类型子状态推入一项
   * @param key
   * @param createStore
   */
  public $pushChildren(key: ChildrenArrayKeys<C>, createStore: CreateStore) {
    const childrenStoreArray = this.children[key] as Array<
      ReturnType<CreateStore>
    >;
    const stateArray = this.childrenState[key] as Array<any>;
    const { length } = stateArray;
    const childrenStore = createStore();
    childrenStoreArray.push(childrenStore);
    stateArray.push(childrenStore.$getState());
    this.$addClearTask(
      childrenStore.$watch((newState) => {
        stateArray[length] = newState;
        this.$$publish();
      })
    );
  }

  /**
   * 废弃实例前需要清理
   */
  private $$clearUp() {
    this.clearTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        this.$$onError(error);
      }
    });
    getSpace(this.constructor).delete(this.id);
  }

  /**
   * 判断是否需要清理
   */
  private $$needClearUp() {
    return this.mode === 'temp' && this.handlers.length === 0;
  }

  /**
   * 抛出错误
   * @param err
   */
  // eslint-disable-next-line class-methods-use-this
  private $$onError(err: unknown) {
    console.error(err);
  }

  /**
   * 初始化子级state
   */
  private $$initChildrenState(children?: C) {
    const childrenState = {} as unknown as ChildrenState<C>;
    if (children)
      Object.entries(children).forEach(([k, ch]) => {
        const key: keyof C = k;
        if (ch instanceof State) {
          childrenState[key] = ch.$getState();
          // 监听子状态变化
          this.$addClearTask(
            ch.$watch((newState) => {
              childrenState[key] = newState;
              this.$$publish();
            })
          );
        } else if (Array.isArray(ch)) {
          childrenState[key] = ch.map((c, i) => {
            // 监听子状态变化
            this.$addClearTask(
              c.$watch((newState) => {
                childrenState[key][i] = newState;
                this.$$publish();
              })
            );
            return c.$getState();
          }) as StateType<C[keyof C]>;
        }
      });
    return childrenState;
  }

  /**
   * 生成getter
   * @param getter
   * @returns
   */
  private $$createGetterState(getter?: G) {
    const getterState: GetterState<G> = {} as GetterState<G>;
    if (!getter) return getterState;

    const defineProperties = Object.keys(getter).reduce((props, k) => {
      const key: keyof G = k;
      props[key] = {
        get: () => {
          try {
            if (!(key in this.getterCache))
              this.getterCache[key] = getter[key](this.$getState());
            return this.getterCache[key] as ReturnType<G[keyof G]>;
          } catch (error) {
            this.$$onError(error);
            throw error;
          }
        },
      };
      return props;
    }, {} as GetterProps<G>);

    Object.defineProperties(getterState, defineProperties);
    return getterState;
  }
}
