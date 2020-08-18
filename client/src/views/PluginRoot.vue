<template>
  <swiper ref="mySwiper" :options="swiperOptions">
      <swiper-slide class="no-swipe">
        <v-container class="nopadd">
          <v-layout row wrap class="nomarg">
            <v-flex xs7 class="text-xs-left">
              <v-btn
                icon
                class="body-2"
                @click="onGitHub"
              >
                <v-icon small>fa-info</v-icon>
              </v-btn>
            </v-flex>
            <v-flex xs4 class="text-xs-right">
              <v-btn
                flat
                class="nav next body-2"
                slot="button-next"
                @click="onSwiperNext"
              >
                <v-icon small>fa-chevron-right</v-icon>
                <span class="text-none" style="padding-left:6px">Deploy</span>
              </v-btn>
            </v-flex>
            <v-flex xs12>
              <v-flex xs9 style="margin-left:35px;">
                <v-select v-model="backend"
                  :items="backends"
                  solo
                  class="body-1"
                  item-value="id"
                  item-text="name"
                  placeholder="Select backend"
                ></v-select>
              </v-flex>
              <Compile
                @onCompile="onCompile"
                @onCompileDirty="onCompileDirty"
                @onDeployDirty="onDeployDirty"
              />
            </v-flex>
          </v-layout>
        </v-container>
      </swiper-slide>
      <swiper-slide class="no-swipe" style="margin-left: 25px;">
        <v-container class="nopadd">
          <v-layout row wrap>
            <v-flex xs6 class="text-xs-left">
              <v-btn
                flat
                class="nav prev body-2"
                slot="button-prev"
                @click="onSwiperPrev"
              >
                <v-icon small>fa-chevron-left</v-icon>
                <span class="text-none" style="padding-left:6px">Compile</span>
              </v-btn>
            </v-flex>
            <v-flex xs4 class="text-xs-right">
              <v-btn
                flat
                class="nav next body-2"
                @click="onCompile"
              >
                <v-icon small>fa-sync</v-icon>
                <span class="text-none" style="padding-left:6px">Recompile</span>
              </v-btn>
            </v-flex>
            <v-flex xs12>
              <Deploy/>
            </v-flex>
          </v-layout>
        </v-container>
      </swiper-slide>
  </swiper>
</template>

<script>
import Vue from 'vue';
import { mapState } from 'vuex';
import VueAwesomeSwiper from 'vue-awesome-swiper';
import evmasm from 'evmasm';
import mevm from 'mevm';
import yulp from 'yulp';
// eslint-disable-next-line
import 'swiper/dist/css/swiper.css';

import Compile from '../components/Compile';
import Deploy from '../components/Deploy';
import { repoLink } from '../config';
import { abiExtract, abiBuildSigsTopics } from '../utils/abiExtract';

Vue.use(VueAwesomeSwiper);

export default {
  components: {
    Compile,
    Deploy,
  },
  data() {
    return {
      swiperOptions: {
        noSwiping: true,
        noSwipingClass: 'no-swipe',
        loop: false,
        slidesPerView: 'auto',
        initialSlide: 0,
      },
      currentSlide: 0,
      github: repoLink,
      backends: [
        {id: 'masm', name: 'masm'},
        {id: 'asm', name: 'asm'},
        {id: 'hex', name: 'hex'},
        {id: 'yul', name: 'yul'},
        {id: 'yulp', name: 'yul+'},
        {id: 'sol', name: 'sol'},
      ],
    };
  },
  computed: {
    ...mapState({
      swiper() {
        return this.$refs.mySwiper.swiper;
      },
      compiled: state => state.compiled,
      source: state => state.source,
      fileName: state => state.fileName,
    }),
    backend: {
      get() {
        return this.$store.state.backend;
      },
      set(value) {
        this.$store.commit('setBackend', value);
      },
    },
  },
  mounted() {
    this.setData();
  },
  methods: {
    async setData() {
      await this.$store.state.remixclient.onload();
      this.setRemixFile();
    },
    async setRemixFile() {
      this.$store.dispatch('listenCurrentFile');
      this.$store.dispatch('setCurrentFile');
    },
    onSwiperPrev() {
      this.swiper.slidePrev();
      this.currentSlide--;
    },
    onSwiperNext() {
      this.swiper.slideNext();
      this.currentSlide++;
    },
    onGitHub() {
      window.open(this.github, '_blank');
    },
    onReload() {
      window.location.reload();
    },
    async onCompile() {
      // We make sure that we are compiling the current file state
      await this.$store.dispatch('setCurrentFile');

      const {backend, source, fileName} = this;
      const compiled = await this.onCompileInternal(backend, source, fileName);
      this.$store.dispatch('setCompiled', compiled);
    },
    async onCompileDirty(backend, source) {
      const {fileName} = this;
      const oldCompiled = this.$store.state.compiled;
      const compiled = await this.onCompileInternal(backend, source, fileName, true);
      compiled.abi = oldCompiled.abi;
      this.$store.dispatch('setCompiled', compiled);
    },
    async onCompileInternal(backend, source, fileName, forcebackend = false) {
      let back = backend;
      let compiled;

      if (!forcebackend) {
        if (fileName.includes('masm')) {
          back = 'masm';
        } else if (fileName.includes('asm')) {
          back = 'asm';
        } else if (fileName.includes('hex')) {
          back = 'hex';
        } else if (fileName.includes('.yulp')) {
          back = 'yulp';
        } else if (fileName.includes('.yul')) {
          back = 'yul';
        } else if (fileName.includes('sol')) {
          back = 'sol';
        }

        if (backend !== back) {
          this.$store.commit('setBackend', back);
        }
      }
      console.log('backend, back', backend, back);

      if (back === 'sol') {
        compiled = await this.onCompileSol(source, fileName);
      } else if (back === 'yulp') {
        compiled = await this.onCompileYulp(source, fileName);
      } else if (back === 'yul') {
        compiled = await this.onCompileYul(source, fileName);
      } else if (back === 'hex') {
        compiled = {evm: {bytecode: {object: source}}};
      } else if (back === 'masm') {
        compiled = await this.onCompileMasm(source);
      } else {
        compiled = await this.onCompileAsm(source);
      }

      console.log('compiled', compiled);
      return compiled;
    },
    async onCompileSol(source, fileName) {
      let output = await this.$store.dispatch('compileFile', {name: fileName, source, backend: 'solc'});
      let compiled = {};

      if (!output) {
        output = {errors: [{message: 'Could not compile.'}]};
      } else {
        output = output.data;
      }

      if (output.contracts) {
        compiled = Object.values(output.contracts)[0];
        // We only select the first contract object now
        // In the future, maybe support multiple
        compiled = Object.values(compiled)[0];
      }
      compiled.errors = output.errors;

      return compiled;
    },
    async onCompileAsm(source) {
      const compiled = {errors: [], evm: {bytecode: {}}, abi: []};
      compiled.evm.assembly = source;

      try {
        compiled.evm.bytecode.object = evmasm.compile(source);
      } catch (errors) {
        compiled.errors = [errors];
      }

      return compiled;
    },
    async onCompileMasm(source) {
      const remixMacros = await this.$store.dispatch('remixfetch', mevm.filename);
      if (remixMacros) {
        this.$store.dispatch('setlocal', {key: mevm.key, source: remixMacros});
      }
      let localMacros = this.$store.state.storageItems[mevm.key];
      if (!localMacros) localMacros = await this.$store.dispatch('remotefetch', mevm);

      const source2 = mevm.compile(source, localMacros);
      const compiled = this.onCompileAsm(source2);
      compiled.abi = abiExtract(source);
      return compiled;
    },
    async onCompileYul(source, fileName) {
      let output = await this.$store.dispatch('compileFile', {name: fileName, source});
      let compiled;

      if (!output) {
        output = {errors: [{message: 'Could not compile.'}]};
      } else {
        output = output.data;
      }

      if (output.contracts) {
        compiled = Object.values(output.contracts)[0];
        // We only select the first contract object now
        // In the future, maybe support multiple
        compiled = Object.values(compiled)[0];
      }
      compiled.yul = source;
      compiled.signatures = [];
      compiled.topics = [];
      compiled.abi = []
      compiled.errors = output.errors;

      return compiled;
    },
    async onCompileYulp(source, fileName) {
      let yulpCompiled = null;
      let yulpResult = null;
      let yulpError = null;
      let compiled = {errors: []};

      try {
        yulpCompiled = yulp.compile(source);
        yulpResult = yulp.print(yulpCompiled.results);
      } catch (yulpErrors) {
        yulpError = [yulpErrors];
        compiled.errors = yulpError;
      }

      if (!yulpError) {
        // For some reason we need to replace . with _ for the web version
        // of solc loaded by Remix from solc-bin to compile the code.
        yulpResult = yulpResult.replace(/\./g, '_');

        let output = await this.$store.dispatch('compileFile', {name: fileName, source: yulpResult, backend: 'yulp'});

        if (!output) {
          output = {errors: [{message: 'Could not compile.'}]};
        } else {
          output = output.data;
        }

        if (output.contracts) {
          compiled = Object.values(output.contracts)[0];
          // We only select the first contract object now
          // In the future, maybe support multiple
          compiled = Object.values(compiled)[0];
        }
        compiled.yul = yulpResult;
        compiled.signatures = yulpCompiled.signatures;
        compiled.topics = yulpCompiled.topics;
        compiled.abi = abiBuildSigsTopics(yulpCompiled.signatures, yulpCompiled.topics);
        compiled.errors = output.errors;
      }
      return compiled;
    },
  },
};
</script>

<style>
.swiper-container {
    height: 100%;
    margin: 0;
    padding: 0;
}
.swiper-slide {
    width: 100%!important;
}
.fullheight, .v-window, .v-window__container {
    height: 100%;
}
.nopadd {
  padding: 0!important;
}
.nomarg {
  margin-left: 0!important;
  margin-right: 0!important;
}
</style>
