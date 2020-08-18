<template>
  <v-flex xs12 style="padding-left: 20px;">
    <v-flex xs10 v-if="compiled.errors && compiled.errors.length > 0">
      <h3>Errors</h3>
      {{compiled.errors.map(v => typeof v === 'object' ? (v.formattedMessage || v.message) : v)}}
    </v-flex>
    <v-flex xs10 v-if="compiled.yul">
      <h3>Yul</h3>
      <div>
        <v-textarea
          v-model="compiled.yul"
          rows="5"
          style="width: 100%;font-size: 12px;"
        ></v-textarea>
      </div>
    </v-flex>
    <v-flex xs10 v-if="compiled.evm && compiled.evm.assembly">
      <h3>Asm</h3>
      <div>
        <v-textarea
          v-model="compiled.evm.assembly"
          rows="5"
          style="width: 100%;font-size: 12px;"
        ></v-textarea>
      </div>
    </v-flex>
    <v-flex xs10 v-if="compiled.evm && compiled.evm.bytecode && compiled.evm.bytecode.object">
      <h3>Bytecode (<small>{{Math.round(compiled.evm.bytecode.object.length / 2)}} bytes</small>)</h3>
      <v-textarea
        v-model="compiled.evm.bytecode.object"
        rows="5"
        style="margin-top: 10px; border: 0px;font-size: 12px;"
      ></v-textarea>
    </v-flex>
  </v-flex>
</template>

<script>

export default {
  props: ['compiled'],
};

</script>
