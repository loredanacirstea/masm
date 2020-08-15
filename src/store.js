import Vue from 'vue';
import Vuex from 'vuex';

import {createIframeClient} from '@remixproject/plugin';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    remixclient: createIframeClient(),
    fileName: '',
    source: '',
    compiled: {},
    storageItems: {},
  },
  mutations: {
    setState(state, {field, data}) {
      state[field] = data;
    },
  },
  actions: {
    setCompiled({commit}, compiled) {
      commit('setState', {field: 'compiled', data: compiled});
    },
    listenCurrentFile({state, dispatch}) {
      const {remixclient} = state;
      remixclient.fileManager.on('currentFileChanged', (fileName) => {
        dispatch('setCurrentFile', fileName);
      });
    },
    async setCurrentFile({state, commit}, newFileName) {
      const {remixclient} = state;

      if (!newFileName) {
        newFileName = await remixclient.fileManager.getCurrentFile().catch(console.log);
      }
      // TODO error notification
      if (!newFileName) return;

      const source = await remixclient.fileManager.getFile(newFileName).catch(console.log);
      commit('setState', {field: 'fileName', data: newFileName});
      commit('setState', {field: 'source', data: source});
    },
    async remotefetch({dispatch}, {url, key}) {
      const response = await fetch(url).catch(console.log);
      const item = await response.text().catch(console.log);
      if (key) {
        dispatch('setlocal', {key, source: item});
      }
      return item;
    },
    localfetch({state, commit}, key) {
      const { storageItems } = state;
      storageItems[key] = localStorage.getItem(`mevm_${key}`);
      commit('setState', {field: 'storageItems', data: storageItems});
    },
    setlocal({state, commit}, {key, source}) {
      const { storageItems } = state;
      localStorage.setItem(`mevm_${key}`, source);
      storageItems[key] = source;
      commit('setState', {field: 'storageItems', data: storageItems});
    },
  },
});
