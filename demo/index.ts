/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
//
import React from 'react';
import {
  componentWithLocalStore,
  connect,
  useLocalStore,
  useStore,
} from '../src/connectToReact';
import defindStore from '../src/core/defindStore';

const base = defindStore({
  state: () => ({
    msg: '测试',
  }),
  children: {},
  getter: {
    getM: (s) => {
      console.log(s);
      return s.msg;
    },
  },
  mutations: {
    setMsg(s, str: string) {
      return { msg: s.msg + str };
    },
  },
  // mutations: {
  //   setMsg(s, str) {
  //     return { msg: str + s.$get };
  //   },
  // },
  actions: {
    actionSetMsg() {
      this.$commit('setMsg', '');
      return '';
    },
  },
});

const usePage = defindStore({
  state: () => ({
    page: 1,
    size: 10,
    finish: false,
  }),
  children: {
    base,
  },
  actions: {
    ss() {
      return '';
    },
  },
});

const useState1 = defindStore({
  setup() {},
  state: () => ({ msg: '', count: 1 }),
  children: {
    pageObj: usePage,
    page1: [usePage, 4],
    page: [usePage, 'async'],
  },
  getter: {
    getMsg(s) {
      return s.msg;
    },
    getD(s) {
      return s.count;
    },
  },
  mutations: {
    setMsg(s, msg: string) {
      return { msg: s.msg + msg };
    },
  },
  actions: {
    /**
     * 获取数据
     * @returns
     */
    getData(n: string) {
      console.log('假装请求数据', n);
      const msg = this.children.page1[0];
      const msg1 = this.children.page1[3].ss();
      const msg2 = this.children.pageObj.ss();
      this.$commit('setMsg', `${msg1}${msg2}`);
      return msg;
    },
    init() {
      this.getData(this.getter.getD.toString());
      this.$pushChildren('page1', usePage);
    },
  },
  keys: {
    abc: '页面1',
  },
});

const state1 = useState1('abc');

export default function render() {
  // 发生变化时执行handler
  const [state, actions] = useStore(
    state1,
    (s) => ({
      count: s.count,
      finish: s.page[0]?.finish,
      a: s,
    }),
    ['getData']
  );
  actions.getData('');

  return `${state.count}`;
}

class A extends React.Component<{
  a: string;
  finish?: boolean;
  getData: Function;
  bb: string;
}> {
  render() {
    const { a } = this.props;
    console.log(a);
    return null;
  }
}

const testA = connect(
  [useState1, 'abc'],
  (s) => ({
    count: s.count,
    finish: s.page[0]?.finish,
    a: s.$get.getMsg,
  }),
  ['getData']
)(A);
testA({ bb: 'ddd' });

const testAA = componentWithLocalStore(
  useState1,
  (s) => ({
    count: s.count,
    finish: s.page[0]?.finish,
    a: s.$get.getMsg,
  }),
  ['getData']
)(A);

testAA({ bb: '123' });

const B = () => {
  const [state, actions, Provider] = useLocalStore(
    useState1,
    (s) => ({
      a: s.count,
    }),
    ['getData']
  );

  console.log(state.a, actions.getData, Provider);

  return null;
};
B();
