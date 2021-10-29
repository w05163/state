/* eslint-disable import/prefer-default-export */
// 工具hooks

import { useRef } from 'react';

/**
 * 类似useMemo，由于官方文档特别说明，所以手动实现一个
 * “你可以把 useMemo 作为性能优化的手段，但不要把它当成语义上的保证。将来，React 可能会选择“遗忘”以前的一些 memoized 值，并在下次渲染时重新计算它们，比如为离屏组件释放内存。”
 * @param func
 * @returns
 */
export function useOnce<T>(func: () => T) {
  const ref = useRef(null) as React.MutableRefObject<{ value: T } | null>;
  if (!ref.current) {
    ref.current = {
      value: func(),
    };
  }
  return ref.current.value;
}
