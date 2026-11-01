/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Button from '@ui/primitives/Button';
import Banner, { BannerPlainContext } from './Banner';
import en from '@app/translations/en.json';
import es from '@app/translations/es.json';
import pt from '@app/translations/pt.json';
import ru from '@app/translations/ru.json';
import tr from '@app/translations/tr.json';
import Tag from './Tag';

const Banners = () => (
  <View style={{ gap: 12 }}>
    <Banner
      tone="seed"
      title="Back up your seed phrase"
      tag={<Tag tone="warning">Not backed up</Tag>}
      action={
        <Button
          variant="primary"
          size="small"
          title="Back up"
          onPress={() => {}}
        />
      }
      onDismiss={() => {}}
      dismissLabel="Dismiss"
    >
      If you lose your phone, this is the only way to recover your funds.
    </Banner>
    <Banner tone="warning" title="Transparent address">
      Funds sent here are public on the chain.
    </Banner>
    <Banner tone="viewOnly" title="View-only wallet">
      This wallet can see funds but cannot spend them.
    </Banner>
    <Banner tone="info" title="Syncing">
      Balances update as blocks arrive.
    </Banner>
  </View>
);

const meta: Meta = { title: 'Components/Banner', render: Banners };
export default meta;
type Story = StoryObj;

export const Tones: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };

/**
 * The Ironwood notice as Home's stack draws it, in every language: the tile
 * and the title on one line, the button with the 16 X close beside it. Then
 * the View-only notice with its X in the corner.
 */
const InStack = () => (
  <BannerPlainContext.Provider value={true}>
    <View style={{ gap: 12 }}>
      {[en, es, pt, ru, tr].map(lang => (
        <Banner
          key={lang.ironwoodbanner.pool}
          tone="warning"
          plain
          title={lang.ironwoodbanner.pool}
          actionBeside
          action={
            <Button
              variant="primary"
              size="small"
              inline
              title={lang.ironwoodbanner.start}
              onPress={() => {}}
            />
          }
          onDismiss={() => {}}
          dismissBeside
          dismissLabel={lang.ironwoodbanner.hide}
        >
          {lang.ironwoodbanner.balance} 1.2345 ZEC
        </Banner>
      ))}
      <Banner
        tone="viewOnly"
        title="View-only wallet"
        onDismiss={() => {}}
        dismissLabel="Dismiss"
      >
        This wallet can see funds but cannot spend them.
      </Banner>
    </View>
  </BannerPlainContext.Provider>
);

export const NoticesInStack: Story = { render: InStack };
export const NoticesInStack200: Story = {
  render: InStack,
  parameters: { textScale: 2 },
};
