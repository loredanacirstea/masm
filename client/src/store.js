import Vue from 'vue';
import Vuex from 'vuex';
import { ethers } from 'ethers';
import taylor from '@pipeos/taylor';

import {createIframeClient} from '@remixproject/plugin';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    remixclient: createIframeClient(),
    fileName: '',
    source: '',
    compiled: {},
    deployedContracts: [],
    storageItems: {},
    backend: 'mevm',
    provider: null,
    signer: null,
    taylor: null,
  },
  mutations: {
    setState(state, {field, data}) {
      state[field] = data;
    },
    setBackend(state, value) {
      state.backend = value;
    },
    setCalldata(state, value) {
      if (
        state.deployedContracts
        && state.deployedContracts[0]
        && state.deployedContracts[0].receipt
      ) {
        state.deployedContracts[0].calldata = value;
      }
    },
  },
  actions: {
    setBackend({commit}, value) {
      console.log('store setBackend', value);
      commit('setState', {field: 'backend', data: value});
    },
    setCompiled({commit}, compiled) {
      commit('setState', {field: 'compiled', data: compiled});
    },
    listenCurrentFile({state, dispatch}) {
      const {remixclient} = state;
      remixclient.fileManager.on('currentFileChanged', (fileName) => {
        dispatch('setCurrentFile', fileName);
      });
    },
    listenRemixProvider({state, dispatch}) {
      const {remixclient} = state;
      remixclient.network.on('providerChanged', (provider) => {
        if (provider === 'vm') {

        }
      })
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
      commit('setState', {field: 'deployedContracts', data: []});
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
    remixfetch({state}, filename) {
      const {remixclient} = state;
      filename = `browser/${filename}`;
      return remixclient.fileManager.getFile(filename).catch(console.log);
    },
    providerfetch({state, commit}) {
      let { provider, signer } = state;
      if (provider) return { provider, signer };

      if (window.ethereum) {
        try {
          provider = new ethers.providers.Web3Provider(window.ethereum)
        } catch (e) {
          console.log('Use a web3-enabled wallet.')
        }
        if (provider) signer = provider.getSigner(0);

        commit('setState', {field: 'provider', data: provider});
        commit('setState', {field: 'signer', data: signer});
        return { provider, signer };
      }
      console.log('Use a web3-enabled wallet.');
      return {};
    },
    async taylorfetch({state, commit, dispatch}) {
      if (!state.taylor) {
        const { provider, signer } = await dispatch('providerfetch');
        if (!provider) return null;
        const tay = await taylor.default(provider, signer);
        console.log('tay', tay);
        await tay.init();

        commit('setState', {field: 'taylor', data: tay});
      }
      commit('setState', {
        field: 'deployedContracts',
        data: [{
          name: 'Taylor Interpreter',
          receipt: {createdAddress: state.taylor.address},
          abi: [],
        }],
      });

      return state.taylor;
    },
    async compileFile({state}, {name, source, backend}) {
      const {remixclient, fileName} = state;
      const settings = {
        evmVersion: null,
        optimize: true,
        language: 'Yul',
        version: '0.7.0+commit.9e61f92b',
      };

      if (backend === 'yulp') settings.version = '0.5.7+commit.6da8b019';
      if (backend === 'solc') settings.language = 'Solidity';

      const contract = {};
      contract[name || fileName] = {content: source };

      console.log('settings', settings);

      const compiled = await remixclient.call('solidity', 'compileWithParameters', contract, settings);
      console.log('--compiled', compiled);
      return compiled;
    },
    async deploy({state, commit}, {deployArgs}) {
      const {compiled, remixclient} = state;
      const accounts = await remixclient.udapp.getAccounts().catch(console.log);
      const args = deployArgs && deployArgs.slice(0, 2) === '0x' ? deployArgs.slice(2) : deployArgs;
      const data = `0x${compiled.evm.bytecode.object}${args}`;
      const transaction = {
        from: accounts[0],
        data,
        gasLimit: 9000000,
        value: '0',
        useCall: false,
      };
      console.log('transaction', transaction);
      const receipt = await remixclient.udapp.sendTransaction(transaction);
      console.log('receipt', receipt);
      let deployedContracts;

      if (receipt.error) {
        deployedContracts = [{
          receipt,
          abi: [],
        }];
      } else {
        // keep only one contract for now
        // TODO: fixme
        deployedContracts = [{
          receipt,
          abi: compiled.abi,
        }];
      }

      commit('setState', {field: 'deployedContracts', data: deployedContracts});
      return deployedContracts;
    },
    async runFunction({state}, {transaction}) {
      const {remixclient, backend} = state;

      console.log('transaction', transaction);

      const accounts = await remixclient.udapp.getAccounts().catch(console.log);
      transaction.from = accounts[0];

      let receipt;
      try {
        receipt = await remixclient.udapp.sendTransaction(transaction);
      } catch (e) {
        receipt = {error: e.message}
      }
      console.log('receipt', receipt);

      if (backend === 'taylor') {
        receipt.data = receipt.return;
        receipt.return = await state.taylor.decode(receipt.data);
      }
      return receipt;
    },
  },
});
