const fs = require('node:fs');
const CracoAlias = require('craco-alias');

/** @type {import('@types/craco__craco').CracoConfig} */
module.exports = {
  devServer: {
    host: 'lp.hub.local',
    port: 3000,
    https: true,
    allowedHosts: 'auto',
    server:{
      options: {
        key: fs.readFileSync('../docker/volumes/ssl/lp.hub.local.key'),
        cert: fs.readFileSync('../docker/volumes/ssl/lp.hub.local.crt'),
      },
    },
    proxy: [
      {
        context: ['/api/'],
        target: 'https://lp.hub.local',
        bypass: async function (req, res, proxyOptions) {
          if (req.url.startsWith('/api/')) {
            res.redirect(proxyOptions.target + req.url);
          }
        },
      },
    ],
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