/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { radiusSheet, space16, useTheme } from '@app/theme';
import Card from '@ui/widgets/Card';
import Text from './Text';
import TextField from './TextField';
import Button from './Button';
import { SurfaceContext, SurfaceKind } from './Surface';
import { CopyIcon } from './Icons/CopyIcon';

/** A card, a field and a secondary button, as they paint on one surface. */
const Set = ({ kind }: { kind: SurfaceKind }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  return (
    <SurfaceContext.Provider value={kind}>
      <View
        style={{
          gap: space16,
          padding: space16,
          borderRadius: kind === 'surface' ? radiusSheet : 0,
          backgroundColor:
            kind === 'surface' ? colors.bgSurface : colors.bgCanvas,
        }}
      >
        <Text variant="bodySmall" tone="muted">
          {kind === 'surface' ? 'In a sheet or panel' : 'On the canvas'}
        </Text>
        <Card>
          <Text variant="bodyStrong">Card</Text>
          <Text variant="bodySmall" tone="muted">
            One step from what it sits on.
          </Text>
        </Card>
        <TextField
          label="Tag"
          value={value}
          onChangeText={setValue}
          placeholder="For example: Shop"
          clearable
        />
        <Button
          variant="secondary"
          icon={CopyIcon}
          title="Copy"
          onPress={() => {}}
        />
      </View>
    </SurfaceContext.Provider>
  );
};

const meta: Meta = {
  title: 'Components/Surface',
  render: () => (
    <View style={{ gap: space16 }}>
      <Set kind="canvas" />
      <Set kind="surface" />
    </View>
  ),
};

export default meta;
export const CanvasAndSheet: StoryObj = {};
