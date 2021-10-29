/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
// 状态空间

const rootStateSpace = new Map<Function, Map<string, any>>();

export default function getSpace(func: Function) {
  const storeMap = rootStateSpace.get(func) ?? new Map<string, any>();
  if (!rootStateSpace.has(func)) rootStateSpace.set(func, storeMap);
  return storeMap;
}
