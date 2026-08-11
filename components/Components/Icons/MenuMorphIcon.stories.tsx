import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { useTheme } from '../../../app/theme';
import { MenuMorphIcon } from './MenuMorphIcon';
import {
  OptionsPanelProvider,
  useOptionsPanel,
} from '../../../app/context/optionsPanel';

const Driver: React.FunctionComponent<{ open: boolean; size: number }> = ({
  open,
  size,
}) => {
  const panel = useOptionsPanel();
  const { colors } = useTheme();
  React.useEffect(() => {
    if (open) {
      panel.open();
    } else {
      panel.close();
    }
  }, [open, panel]);
  return <MenuMorphIcon size={size} color={colors.fgDefault} />;
};

const meta: Meta<typeof Driver> = {
  title: 'Icons/MenuMorphIcon',
  component: Driver,
  decorators: [
    Story => (
      <OptionsPanelProvider>
        <Story />
      </OptionsPanelProvider>
    ),
  ],
  args: { open: false, size: 40 },
};

export default meta;
type Story = StoryObj<typeof Driver>;

export const Menu: Story = {};
export const Close: Story = { args: { open: true } };
