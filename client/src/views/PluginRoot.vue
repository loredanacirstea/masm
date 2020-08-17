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
              <Compile @onCompile="onCompile" localfetch="localfetch"/>
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
      backends: [{id: 'mevm', name: 'mevm'}, {id: 'yulp', name: 'yul+'}],
    };
  },
  computed: {
    ...mapState({
      swiper() {
        return this.$refs.mySwiper.swiper;
      },
      compiled: state => state.compiled,
      source: state => state.source,
      // backend: state => state.backend,
      // backend: {
      //   get() { return this.$store.state.backend; },
      //   set(value) { this.$store.dispatch('setBackend', value) },
      // },
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
    // onChangeBackend(value) {
    //   console.log('onChangeBackend', value);
    //   this.$store.commit('setBackend', value);
    // },
    async onCompile() {
      let compiled;
      // We make sure that we are compiling the current file state
      await this.$store.dispatch('setCurrentFile');

      const {backend, source} = this;
      console.log('backend', backend);
      if (backend === 'yulp') {
        compiled = await this.onCompileYulp(source, this.fileName);
      } else {
        compiled = await this.onCompileMevm(source);
      }

      console.log('compiled', compiled);
      this.$store.dispatch('setCompiled', compiled);
    },
    async onCompileMevm(source) {
      const remixMacros = await this.$store.dispatch('remixfetch', mevm.filename);
      if (remixMacros) {
        this.$store.dispatch('setlocal', {key: mevm.key, source: remixMacros});
      }
      let localMacros = this.$store.state.storageItems[mevm.key];
      if (!localMacros) localMacros = await this.$store.dispatch('remotefetch', mevm);
      const compiled = {errors: [], evm: {bytecode: {}}};

      const source2 = mevm.compile(source, localMacros);
      compiled.source = source2;

      try {
        compiled.evm.bytecode.object = evmasm.compile(source2);
        console.log(compiled)
      } catch (errors) {
        compiled.errors = [errors];
      }
      compiled.abi = abiExtract(source);
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

        let output = await this.$store.dispatch('compileFile', {name: fileName, source: yulpResult});

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
        compiled.source = yulpResult;
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
