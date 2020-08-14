<template>
  <v-flex xs12 style="padding-left: 20px;">
    <v-flex xs10 v-if="compiled.errors">
      <h3>Errors</h3>
      {{compiled.errors.map(v => typeof v === 'object' ? (v.formattedMessage || v.message) : v)}}
    </v-flex>
    <v-flex xs10 v-if="compiled.evm.bytecode">
      <h3>(<small>{{Math.round(compiled.evm.bytecode.object.length / 2)}} bytes</small>)</h3>
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
