import { Ref } from '@vue/reactivity';

export type ActionKeys<S> = {
  [K in keyof S]: S[K] extends Function ? K : never;
}[keyof S];

export type CreateStore<S, ID = undefined> = (id?: ID) => S;

export type VueComputed<S> = {
  [K in keyof S]: () => S[K];
};

export type VueRefMap<S> = {
  [K in keyof S]: Ref<S[K]>;
};

export type FuncThis<F> = F extends (this: infer T) => any ? T : never;
