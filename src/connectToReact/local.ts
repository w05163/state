/* eslint-disable @typescript-eslint/no-explicit-any */
// 局部状态连接

import type {
  ClassicComponent,
  ClassicComponentClass,
  ClassType,
  Component,
  ComponentClass,
  ComponentState,
  FunctionComponent,
} from 'react';
import React, { createElement, useContext } from 'react';
import State from '../core/state';
import type { ActionKeys } from './global';
import { useStore } from './global';
import { useOnce } from './hooks';

type CreateStore<S> = () => S;

const contextMap = new Map<Function, any>();

/**
 * 获取store对应的React.Context，如果没有，将会创建一个
 * @param createStore
 * @returns
 */
export function getContext<S1>(createStore: CreateStore<S1>) {
  if (contextMap.has(createStore))
    return contextMap.get(createStore) as React.Context<S1>;
  const context = React.createContext(undefined as unknown as S1);
  contextMap.set(createStore, context);
  return context;
}

/**
 * 使用局部状态管理
 * @param createStore
 * @param handler
 * @param actionKeys
 * @returns
 */
export function componentWithLocalStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
) {
  type SS = S & Pick<S1, K>;
  const storeContext = getContext(createStore);
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
      const store = useOnce(() => createStore());
      const [state, actions] = useStore(store, handler, actionKeys);
      return createElement(
        storeContext.Provider,
        { value: store },
        createElement<P>(TargetCom, {
          ...props,
          ...state,
          ...actions,
        } as unknown as P)
      );
    };
}

/**
 *
 * @param createStore
 * @param handler
 * @param keys
 * @returns
 */
export function useLocalStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
): [S, Pick<S1, K>, React.Provider<S1>] {
  const storeContext = getContext(createStore);
  const store = useOnce(() => createStore());
  const [state, actions] = useStore(store, handler, actionKeys);
  return [state, actions, storeContext.Provider];
}

/**
 * 使用context中传递的store
 * @param createStore
 * @param handler
 * @param keys
 * @returns
 */
export function useContextStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<S1>,
  handler: (state: ReturnType<S1['$getState']>) => S,
  actionKeys?: K[]
): [S, Pick<S1, K>] {
  const store = useContext(getContext(createStore));
  return useStore(store, handler, actionKeys);
}
