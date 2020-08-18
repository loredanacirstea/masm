module.exports = {
  publicPath: '/mevm',
  baseUrl: '/mevm',
  chainWebpack: config => {
    config.module.rule('eslint').exclude.add(/yulp|mevm/);
  },
};
