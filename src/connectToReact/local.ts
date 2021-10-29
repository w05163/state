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
import React, { createElement } from 'react';
import type { ActionKeys, CreateStore } from '.';
import useStore from '.';
import State from '../core/state';
import { useOnce } from './hooks';

const contextMap = new Map<Function, any>();

/**
 * 获取store对应的React.Context，如果没有，将会创建一个
 * @param createStore
 * @returns
 */
export function getContext<S1>(createStore: CreateStore<undefined, S1>) {
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
export default function componentWithLocalStore<
  S1 extends State<any, any, any, any>,
  S,
  K extends ActionKeys<S1>
>(
  createStore: CreateStore<undefined, S1>,
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
      const target = useOnce(() => createStore());
      const [state, actions] = useStore(target, handler, actionKeys);
      return createElement(
        storeContext.Provider,
        { value: target },
        createElement<P>(TargetCom, {
          ...props,
          ...state,
          ...actions,
        } as unknown as P)
      );
    };
}

/**
 * 使用context中传递的store
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
  createStore: () => S1,
  handler: (state: ReturnType<S1['$getState']>) => S,
  keys?: K[]
): [S, Pick<S1, K>] {
  return useStore(createStore(), handler, keys);
}
