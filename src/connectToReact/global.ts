/* eslint-disable @typescript-eslint/no-explicit-any */
// 连接到react组件
import type {
  ClassicComponent,
  ClassicComponentClass,
  ClassType,
  Component,
  ComponentClass,
  ComponentState,
  FunctionComponent,
} from 'react';
import { createElement, useEffect, useState } from 'react';
import type State from '../core/state';
import { useOnce } from './hooks';

export type ActionKeys<S> = {
  [K in keyof S]: S[K] extends Function ? K : never;
}[keyof S];

export function useStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  target: S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
): [S, Pick<S1, K>] {
  const initState = useOnce(() => handler(target.$getState()));
  const [state, setState] = useState(initState);
  useEffect(
    () =>
      target.$watch((newState) => {
        setState(handler(newState));
      }),
    [target]
  );
  const actions = {} as Pick<S1, K>;
  actionKeys?.forEach((key) => {
    actions[key] = (target[key] as Function).bind(target);
  });
  return [state, actions];
}

export type CreateStore<ID, S> = (id?: ID) => S;

export function connect<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>,
  ID
>(
  createStore: [CreateStore<ID, S1>, ID?],
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
) {
  type SS = S & Pick<S1, K>;
  return <P>(
      TargetCom:
        | FunctionComponent<P>
        | ClassType<
            P,
            ClassicComponent<P, ComponentState>,
            ClassicComponentClass<P>
          >
        | ClassType<P, Component<P, ComponentState>, ComponentClass<P>>
        | ComponentClass<P>
        | string
    ) =>
    (props: Omit<P, keyof SS>) => {
      const target = createStore[0](createStore[1]);
      const [state, actions] = useStore(target, handler, actionKeys);
      return createElement<P>(TargetCom, {
        ...props,
        ...state,
        ...actions,
      } as unknown as P);
    };
}
