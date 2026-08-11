/* eslint-disable react-native/no-inline-styles */
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../app/theme';

import { BiohazardIcon } from './BiohazardIcon';
import { ChevronDown, ChevronUp } from './Chevron';
import { CopyIcon } from './CopyIcon';
import { EyeIcon } from './EyeIcon';
import { FiltersIcon } from './FiltersIcon';
import { HouseFilledIcon } from './HouseFilledIcon';
import { HouseOutlineIcon } from './HouseOutlineIcon';
import { ListIcon } from './ListIcon';
import { MessagesIcon } from './MessagesIcon';
import { ReceiveFilledIcon } from './ReceiveFilledIcon';
import { ReceiveIcon } from './ReceiveIcon';
import { SendFilledIcon } from './SendFilledIcon';
import { SendOutlineIcon } from './SendOutlineIcon';
import { ShieldIcon } from './ShieldIcon';
import { SkullIcon } from './SkullIcon';
import { TriangleAlert } from './TriangleAlert';
import { VerifyCheckIcon } from './VerifyCheckIcon';
import { VerifyXIcon } from './VerifyXIcon';
import { XIcon } from './XIcon';

const icons = {
  Biohazard: BiohazardIcon,
  ChevronDown,
  ChevronUp,
  Copy: CopyIcon,
  Eye: EyeIcon,
  Filters: FiltersIcon,
  HouseFilled: HouseFilledIcon,
  HouseOutline: HouseOutlineIcon,
  List: ListIcon,
  Messages: MessagesIcon,
  ReceiveFilled: ReceiveFilledIcon,
  Receive: ReceiveIcon,
  SendFilled: SendFilledIcon,
  SendOutline: SendOutlineIcon,
  Shield: ShieldIcon,
  Skull: SkullIcon,
  TriangleAlert,
  VerifyCheck: VerifyCheckIcon,
  VerifyX: VerifyXIcon,
  X: XIcon,
};

const Gallery: React.FunctionComponent<{ size: number }> = ({ size }) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        alignItems: 'flex-start',
      }}
    >
      {Object.entries(icons).map(([name, IconCmp]) => (
        <View key={name} style={{ alignItems: 'center', width: 84, gap: 6 }}>
          <IconCmp size={size} color={colors.fgDefault} />
          <Text style={{ color: colors.fgMuted, fontSize: 11 }}>{name}</Text>
        </View>
      ))}
    </View>
  );
};

const meta: Meta<typeof Gallery> = {
  title: 'Icons/Gallery',
  component: Gallery,
  args: { size: 28 },
};

export default meta;
type Story = StoryObj<typeof Gallery>;

export const All: Story = {};
export const Large: Story = { args: { size: 48 } };
