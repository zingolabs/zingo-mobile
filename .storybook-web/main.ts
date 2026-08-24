import path from 'path';
import { readFile } from 'fs/promises';
import type { Plugin } from 'vite';
import type { StorybookConfig } from '@storybook/react-native-web-vite';

const WORKLET_DEP = /react-native-(reanimated|worklets)[/\\].*\.[cm]?js$/;

// Transform reanimated and worklets with the Worklets Babel plugin
const workletsBabel = (): Plugin => ({
  name: 'worklets-babel',
  async transform(code, id) {
    if (!WORKLET_DEP.test(id.split('?')[0])) {
      return null;
    }
    const babel = await import('@babel/core');
    const result = await babel.transformAsync(code, {
      filename: id.split('?')[0],
      babelrc: false,
      configFile: false,
      sourceMaps: true,
      // disableSourceMaps stops the plugin from reading inputMap sources
      plugins: [['react-native-worklets/plugin', { disableSourceMaps: true }]],
    });
    return result?.code ? { code: result.code, map: result.map } : null;
  },
});

// Mirror metro's svgXmlTransformer on web: a `.svg` import becomes a
// component that renders <SvgXml xml={...} />, so web and native draw the
// same asset through react-native-svg.
const svgAsSvgXml = (): Plugin => ({
  name: 'svg-as-svgxml',
  enforce: 'pre',
  async load(id) {
    const file = id.split('?')[0];
    if (!file.endsWith('.svg')) {
      return null;
    }
    const xml = await readFile(file, 'utf8');
    return `import React from 'react';
import { SvgXml } from 'react-native-svg';
const xml = ${JSON.stringify(xml)};
export default props => React.createElement(SvgXml, Object.assign({ xml }, props));`;
  },
});

const main: StorybookConfig = {
  stories: ['../components/**/*.stories.?(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // The Worklets Babel plugin
      pluginReactOptions: {
        babel: {
          plugins: [
            ['react-native-worklets/plugin', { disableSourceMaps: true }],
          ],
        },
      },
    },
  },
  viteFinal: async config => {
    // Relative asset paths so the static build works served from any subpath
    // (gh-pages root for dev, /pr/<n>/storybook/ inside a PR report).
    config.base = './';
    config.plugins = [svgAsSvgXml(), ...(config.plugins ?? [])];
    // Keep reanimated pre-bundled for correct interop, and run the worklet transform in the rolldown dep optimizer.
    config.optimizeDeps = config.optimizeDeps ?? {};
    config.optimizeDeps.rollupOptions = config.optimizeDeps.rollupOptions ?? {};
    const depPlugins = config.optimizeDeps.rollupOptions.plugins;
    config.optimizeDeps.rollupOptions.plugins = [
      ...(Array.isArray(depPlugins) ? depPlugins : []),
      workletsBabel(),
    ];
    config.resolve = config.resolve ?? {};
    const existing = config.resolve.alias;
    config.resolve.alias = [
      ...(Array.isArray(existing)
        ? existing
        : Object.entries(existing ?? {}).map(([find, replacement]) => ({
            find,
            replacement,
          }))),
      // No web build; serve the storybook stub instead.
      {
        find: 'react-native-localize',
        replacement: path.resolve(
          __dirname,
          './shims/react-native-localize.ts',
        ),
      },
      {
        find: 'react-native-fs',
        replacement: path.resolve(__dirname, './shims/react-native-fs.ts'),
      },
      {
        find: '@notifee/react-native',
        replacement: path.resolve(__dirname, './shims/notifee.ts'),
      },
      // The native bridge: walletBackend reaches it as '../../RPCModule'.
      // Screens then run their real wrappers against story fixtures.
      {
        find: /^(?:\.\.\/)+RPCModule$/,
        replacement: path.resolve(__dirname, './shims/rpcModule.ts'),
      },
    ];
    return config;
  },
};

export default main;
