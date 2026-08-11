import path from 'path';
import { readFile } from 'fs/promises';
import type { Plugin } from 'vite';
import type { StorybookConfig } from '@storybook/react-native-web-vite';

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
    options: {},
  },
  viteFinal: async config => {
    config.plugins = [svgAsSvgXml(), ...(config.plugins ?? [])];
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // No web build; serve the storybook stub instead.
      'react-native-localize': path.resolve(
        __dirname,
        './shims/react-native-localize.ts',
      ),
    };
    return config;
  },
};

export default main;
