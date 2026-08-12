import { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: ['../screens/**/*.stories.?(ts|tsx)', '../ui/**/*.stories.?(ts|tsx)'],
  addons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
  ],
};

export default main;
