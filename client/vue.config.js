module.exports = {
  publicPath: '/masm',
  chainWebpack: config => {
    config.module.rule('eslint').exclude.add(/yulp|masm|evmasm|taylor/);
  },
};
