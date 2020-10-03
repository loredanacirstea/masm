module.exports = {
  publicPath: '/masm',
  baseUrl: '/masm',
  chainWebpack: config => {
    config.module.rule('eslint').exclude.add(/yulp|mevm|evmasm|taylor/);
  },
};
