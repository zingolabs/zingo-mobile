import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import InfoStep from './components/InfoStep';
import WordsStep from './components/WordsStep';
import DoneStep from './components/DoneStep';
import ScreenshotSheet from './components/ScreenshotSheet';
import { withAppContext } from '../../.storybook/storyDecorators';

const WORDS =
  'ridge autumn velvet copper shadow marble pilot fabric gallery timber nectar quartz lantern puzzle orbit saddle breeze cobalt ember ladder mosaic tunnel violet anchor'.split(
    ' ',
  );

const meta: Meta = {
  title: 'SeedBackup/Steps',
  decorators: [withAppContext()],
};

export default meta;
type Story = StoryObj;

export const Info: Story = { render: () => <InfoStep keychainNote /> };

const words = (hidden: boolean, checked: boolean) => (
  <WordsStep
    words={WORDS}
    birthday={3512840}
    hidden={hidden}
    veiled={hidden}
    onToggleHide={() => {}}
    onCopy={() => {}}
    checked={checked}
    onCheck={() => {}}
    nudge={0}
  />
);

export const Words: Story = { render: () => words(false, false) };
export const WordsHidden: Story = { render: () => words(true, true) };
export const Done: Story = { render: () => <DoneStep /> };
export const ScreenshotWarning: Story = {
  render: () => (
    <>
      {words(false, false)}
      <ScreenshotSheet leaving={false} onGotIt={() => {}} onGone={() => {}} />
    </>
  ),
};
