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
import type { Action, ActionKeysMap, CreateStore } from '../types/helper';
import { makeActions, microDebounce } from '../utils';
import { useOnce } from '../utils/hooks';

export function useStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeysMap<S1>
>(
  store: S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K
): [S, Action<S1, K>] {
  const initState = useOnce(() => handler(store.$getState()));
  const [state, setState] = useState(initState);
  useEffect(() => {
    const fun = (newState: ReturnType<S1['$getState']>) => {
      setState(handler(newState));
    };
    store.$watch(microDebounce(fun));
  }, [store]);
  const actions = makeActions(store, actionKeys);
  return [state, actions];
}

export function connect<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeysMap<S1>,
  ID
>(
  createStore: [CreateStore<S1, ID>, ID],
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K
) {
  type SS = S & Action<S1, K>;
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
      const store = createStore[0](createStore[1]);
      const [state, actions] = useStore(store, handler, actionKeys);
      return createElement<P>(TargetCom, {
        ...props,
        ...state,
        ...actions,
      } as unknown as P);
    };
}
