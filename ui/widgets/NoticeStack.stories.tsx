import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import NoticeStack from './NoticeStack';
import SeedBackupNotice from '@screens/History/components/SeedBackupNotice';
import { PriceCard } from './Header/components/PriceRow';
import { mockInfo, mockZecPrice } from '../../.storybook/storyMocks';
import {
  mockTranslate,
  withAppContext,
} from '../../.storybook/storyDecorators';

const seed = {
  key: 'seed',
  node: (
    <SeedBackupNotice backedUp={false} covered={false} onBackUp={() => {}} />
  ),
};
const price = {
  key: 'price',
  node: (
    <PriceCard
      translate={mockTranslate}
      zecPrice={mockZecPrice}
      info={mockInfo}
      server={remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName)}
    />
  ),
};

const meta: Meta<typeof NoticeStack> = {
  title: 'History/NoticeStack',
  component: NoticeStack,
  decorators: [withAppContext()],
  args: { notices: [seed, price], onHeight: () => {} },
};

export default meta;
type Story = StoryObj<typeof NoticeStack>;

export const Pile: Story = {};
export const Single: Story = { args: { notices: [price] } };
