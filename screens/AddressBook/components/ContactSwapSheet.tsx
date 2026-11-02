/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { space4, space8, space16, space20, useTheme } from '@app/theme';
import { AddressBookFileClass } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { SwapDirectionEnum } from '@app/swap';
import type { SwapService, TokenEntryType } from '@app/swap';
import Utils from '@app/utils';
import ListRow from '@ui/primitives/ListRow';
import Text from '@ui/primitives/Text';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import { ZEC_TOKEN_ENTRY, chainCoin } from '@screens/Swap/swapAssets';

const LOGO = 28;
const LOGO_OVERLAP = -8;

/** The contact's coin in each direction; a direction SwapKit does not route has none. */
export type SwapCoins =
  | { kind: 'loading' }
  | { kind: 'loaded'; to?: TokenEntryType; from?: TokenEntryType };

/**
 * What the contact's chain swaps with, from the catalog the Swap tab quotes
 * from, so the sheet never offers what the tab would not have. A catalog that
 * cannot be read offers nothing.
 */
export const loadSwapCoins = async (
  service: SwapService,
  chain: string,
): Promise<SwapCoins> => {
  try {
    const [outbound, inbound] = await Promise.all([
      service.listRoutableTokens('outbound'),
      service.listRoutableTokens('inbound'),
    ]);
    return {
      kind: 'loaded',
      to: chainCoin(outbound, chain),
      from: chainCoin(inbound, chain),
    };
  } catch {
    return { kind: 'loaded' };
  }
};

/** An address book swap string, with the contact and its coin filled in. */
export const contactSwapText = (
  template: string,
  contact: AddressBookFileClass,
  coin = '',
): string =>
  template
    .replace('{name}', contact.label)
    .replace(/\{coin\}/g, coin)
    .replace('{chain}', chainDisplayName(contact.swapChain));

const Pair = ({ from, to }: { from: TokenEntryType; to: TokenEntryType }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      <TokenLogo token={from} size={LOGO} surfaceColor={colors.bgSurface} />
      <View style={{ marginLeft: LOGO_OVERLAP }}>
        <TokenLogo token={to} size={LOGO} surfaceColor={colors.bgSurface} />
      </View>
    </View>
  );
};

/** Which way a swap with a contact goes; the title bar names the contact. */
const ContactSwapSheet: React.FunctionComponent<{
  contact: AddressBookFileClass;
  coins: SwapCoins;
  onChoose: (direction: SwapDirectionEnum, coin: TokenEntryType) => void;
}> = ({ contact, coins, onChoose }) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const say = (key: string, coin?: TokenEntryType) =>
    contactSwapText(translate(key) as string, contact, coin?.ticker);

  return (
    <View style={{ paddingBottom: space16 }}>
      <Text
        testID="addressbook.swap.address"
        variant="caption"
        tone="muted"
        style={{
          textAlign: 'center',
          marginTop: space4,
          marginBottom: space8,
        }}
      >
        {`${Utils.trimToSmall(contact.address, 6)} · ${say('addressbook.swap-address')}`}
      </Text>
      {coins.kind === 'loading' && (
        <ActivityIndicator
          testID="addressbook.swap.loading"
          size="small"
          color={colors.fgMuted}
          style={{ marginVertical: space16 }}
        />
      )}
      {coins.kind === 'loaded' && !coins.to && !coins.from && (
        <Text
          testID="addressbook.swap.none"
          variant="bodySmall"
          tone="muted"
          style={{
            textAlign: 'center',
            marginVertical: space16,
            paddingHorizontal: space20,
          }}
        >
          {(translate('swap.msg-no-route') as string).trim()}
        </Text>
      )}
      {coins.kind === 'loaded' && !!coins.to && (
        <ListRow
          testID="addressbook.swap.to"
          leading={<Pair from={ZEC_TOKEN_ENTRY} to={coins.to} />}
          title={say('addressbook.swap-to', coins.to)}
          subtitle={say('addressbook.swap-to-line', coins.to)}
          chevron
          onPress={() =>
            coins.to && onChoose(SwapDirectionEnum.Outbound, coins.to)
          }
        />
      )}
      {coins.kind === 'loaded' && !!coins.from && (
        <ListRow
          testID="addressbook.swap.from"
          leading={<Pair from={coins.from} to={ZEC_TOKEN_ENTRY} />}
          title={say('addressbook.swap-from', coins.from)}
          subtitle={say('addressbook.swap-from-line', coins.from)}
          chevron
          divider={!!coins.to}
          onPress={() =>
            coins.from && onChoose(SwapDirectionEnum.Inbound, coins.from)
          }
        />
      )}
    </View>
  );
};

export default ContactSwapSheet;
