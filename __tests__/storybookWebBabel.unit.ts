import type { PluginItem } from '@babel/core';
import main from '../.storybook-web/main';
import reactCompiler from '../babel.react-compiler';

const pluginName = (plugin: PluginItem): string =>
  Array.isArray(plugin) ? String(plugin[0]) : String(plugin);

describe('storybook web babel plugins', () => {
  // Tests that the Storybook web build compiles with the compiler entry Metro uses when both read babel.react-compiler.js. The compiler runs before the worklets plugin.
  test('the web build carries the shared compiler entry before worklets', () => {
    if (typeof main.framework === 'string') {
      throw new Error('framework options missing');
    }
    const plugins: PluginItem[] =
      main.framework.options.pluginReactOptions?.babel?.plugins ?? [];
    expect(plugins[0]).toBe(reactCompiler);
    expect(plugins.map(pluginName)).toEqual([
      'babel-plugin-react-compiler',
      'react-native-worklets/plugin',
    ]);
  });
});
