/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import ContactRow from './ContactRow';
import { withAppContext } from '../../../.storybook/storyDecorators';
import { sampleContact, tAddress } from '../../../.storybook/storyMocks';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';

const publicContact = new AddressBookFileClass(
  'Pedro',
  tAddress,
  '#8FB4E6',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const meta: Meta<typeof ContactRow> = {
  title: 'AddressBook/ContactRow',
  component: ContactRow,
  decorators: [
    Story => (
      <View
        style={{
          margin: 22,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#05234C',
          backgroundColor: '#05101E',
          overflow: 'hidden',
        }}
      >
        <Story />
      </View>
    ),
    withAppContext(),
  ],
  args: {
    contact: sampleContact,
    first: true,
    open: false,
    sendable: true,
    editable: true,
    flash: false,
    leaving: false,
    onToggle: () => {},
    onSwipe: () => {},
    onSend: () => {},
    onCopy: () => {},
    onEdit: () => {},
    onDelete: () => {},
    onLeft: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ContactRow>;

export const Default: Story = {};

export const Open: Story = { args: { open: true } };

export const Public: Story = { args: { contact: publicContact } };

export const ViewOnly: Story = { args: { open: true, sendable: false } };
