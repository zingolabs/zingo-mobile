import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTheme } from '@app/theme';
import Text from './Text';
import ListRow from './ListRow';
import { KeyIcon } from './Icons/KeyIcon';

const Rows = () => {
  const { colors } = useTheme();
  return (
    <>
      <ListRow
        title="Seed phrase"
        subtitle="24 words, backed up"
        leading={<KeyIcon size={20} color={colors.fgMuted} />}
        chevron
        onPress={() => {}}
      />
      <ListRow
        title="Received"
        subtitle="Oct 18, 12:24"
        trailing={
          <Text variant="bodyStrong" tone="accent">
            +1.2345 ZEC
          </Text>
        }
        divider
      />
    </>
  );
};

const meta: Meta = { title: 'Components/ListRow', render: Rows };
export default meta;
type Story = StoryObj;

export const Default: Story = {};
/** The trailing value wraps below the title instead of squeezing it. */
export const Large200: Story = { parameters: { textScale: 2 } };
