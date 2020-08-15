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
              <Compile @onCompile="onCompile"/>
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
// eslint-disable-next-line
import 'swiper/dist/css/swiper.css';

import Compile from '../components/Compile';
import Deploy from '../components/Deploy';
import { repoLink } from '../config';
import { abiExtract } from '../utils/abiExtract';

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
    };
  },
  computed: mapState({
    swiper() {
      return this.$refs.mySwiper.swiper;
    },
    compiled: state => state.compiled,
    source: state => state.source,
  }),
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

      const {source} = this;
      const compiled = {errors: [], evm: {bytecode: {}}};

      const source2 = macroHandle(source);
      compiled.source = source2;

      try {
        compiled.evm.bytecode.object = evmasm.compile(source2);
        console.log(compiled)
      } catch (errors) {
        compiled.errors = [errors];
      }
      compiled.abi = abiExtract(source);
      console.log('compiled', compiled);
      this.$store.dispatch('setCompiled', compiled);
    },
  },
};

function macroHandle(source) {
  // const getmacrosRg = /(?<=%macro).*?(?=%endmacro)/gs;
  const getmacrosRg = /%macro.*?%endmacro/gs;
  const getstline = /(?<=%macro).*/;
  const ARG_SEP = ' ';
  const PARAM_SEP = ',';
  const END_LEN = '%endmacro'.length;
  const macros = {};
  let newsource = '';
  const matches = [...source.matchAll(getmacrosRg)];
  let lasti = 0;
  matches.forEach(match => {
    const macro_args = match[0].match(getstline);
    const [name, ...args] = macro_args[0].trim().split(ARG_SEP).map(val => val.trim());
    const macrobody = match[0].substring(
      macro_args.index + macro_args[0].length,
      match[0].length - END_LEN
    );

    const fn = margs => {
      let body = macrobody;
      margs.forEach((val, i) => {
        body = body.replace(`%${i}`, val);
      });
      return body;
    }

    macros[name] = { fn, count: 0 };
    newsource += source.substring(lasti, match.index);
    lasti = match.index + match[0].length;
  });
  newsource += source.substring(lasti);

  const source2 = newsource;
  newsource = '';
  const usematches = Object.keys(macros).map(name => {
    const usereg = new RegExp(`(?<!%macro\\s*)${name}\\s.*`, 'g');
    return [...source2.matchAll(usereg)].map((val, i) => {
      val.macroname = name;
      val.instanceno = i;
      return val;
    });
  }).reduce((accum, val) => accum.concat(val))
    .sort((a, b) => a.index - b.index);

  lasti = 0;
  usematches.forEach(usematch => {
    const name = usematch.macroname;
    const params = usematch[0].substring(name.length).trim().split(PARAM_SEP).map(val => val.trim());
    const text = macros[name].fn(params);
    const comment = `/* (${usematch.instanceno}) ${name} ${params.join(', ')}    */\n`;
    newsource += source2.substring(lasti, usematch.index) + comment + text;
    lasti = usematch.index + usematch[0].length;
  });

  newsource += source2.substring(lasti);
  return newsource;
}
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
