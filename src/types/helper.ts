import { Ref } from '@vue/reactivity';

export type ActionKeys<S> = {
  [K in keyof S]: S[K] extends Function ? K : never;
}[keyof S];

export type ActionKeysMap<S> = ActionKeys<S>[] | Record<string, ActionKeys<S>>;

export type ActionMap<S, KM extends Record<string, keyof S>> = {
  [K in keyof KM]: S[KM[K]];
};

export type ArrayToUn<T extends any[]> = T extends (infer R)[] ? R : never;
export type ArrayActionPick<S, KA extends (keyof S)[]> = Pick<S, ArrayToUn<KA>>;

export type Action<S, K> = K extends (keyof S)[]
  ? ArrayActionPick<S, K>
  : K extends Record<string, keyof S>
  ? ActionMap<S, K>
  : never;

export type CreateStore<S, ID = undefined> = (id?: ID) => S;

export type VueComputed<S> = {
  [K in keyof S]: () => S[K];
};

export type VueRefMap<S> = {
  [K in keyof S]: Ref<S[K]>;
};

export type FuncThis<F> = F extends (this: infer T) => any ? T : never;
