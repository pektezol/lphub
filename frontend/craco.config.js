const fs = require('node:fs');
const CracoAlias = require('craco-alias');

const host = process.env.HOST_DOMAIN ?? 'lp.hub.local';
const isCodespaces = host.endsWith('.app.github.dev');

const proxyDomain = isCodespaces
  ? host.replace('-3000.app.github.dev', '-443.app.github.dev')
  : process.env.PROXY_DOMAIN ?? 'lp.hub.local';

/** @type {import('@types/craco__craco').CracoConfig} */
module.exports = {
  devServer: {
    host,
    port: 3000,
    https: !isCodespaces,
    allowedHosts: 'auto',
    client: !isCodespaces,
    server: {
      options: {
        key: isCodespaces ? undefined : fs.readFileSync(`../docker/volumes/ssl/${host}.key`),
        cert: isCodespaces ? undefined : fs.readFileSync(`../docker/volumes/ssl/${host}.crt`),
      },
    },
    proxy: [
      {
        context: ['/api/'],
        target: 'https://' + proxyDomain,
        bypass: async function (req, res, proxyOptions) {
          if (req.url.startsWith('/api/')) {
            res.redirect(proxyOptions.target + req.url);
          }
        },
      },
    ],
  },
  webpack: {
    configure: (webpackConfig, { paths }) => {
        paths.appBuild = webpackConfig.output.path = require('path').resolve('../docker/volumes/build/app');
        return webpackConfig;
      },
  },
  plugins: [
    {
      plugin: CracoAlias,
      options: {
        source: 'tsconfig',
        baseUrl: './src',
        tsConfigPath: './tsconfig.paths.json',
      },
    },
  ],
};