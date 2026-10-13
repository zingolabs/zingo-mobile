/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import ContactSheet from './ContactSheet';
import {
  withAppContext,
  withNavigation,
  withRpc,
} from '../../../.storybook/storyDecorators';
import { json } from '../../../.storybook/storyRpc';
import { sampleContact } from '../../../.storybook/storyMocks';
import { ChainNameEnum } from '@app/AppState';

const unified = json({
  status: 'success',
  chain_name: 'main',
  address_kind: 'unified',
});

const meta: Meta<typeof ContactSheet> = {
  title: 'AddressBook/ContactSheet',
  component: ContactSheet,
  decorators: [
    Story => (
      <View style={{ backgroundColor: '#05101E', paddingVertical: 20 }}>
        <Story />
      </View>
    ),
    withRpc({ parseAddressInfo: unified }),
    withNavigation,
    withAppContext(),
  ],
  args: {
    edit: { kind: 'new', preset: '' },
    book: [sampleContact],
    walletChain: ChainNameEnum.mainChainName,
    onSave: async () => {},
    onCancel: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ContactSheet>;

export const New: Story = {};

export const Edit: Story = {
  args: { edit: { kind: 'edit', contact: sampleContact } },
};
