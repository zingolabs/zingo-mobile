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
import Card from '@ui/widgets/Card';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import {
  ZEC_TOKEN_ENTRY,
  chainCoin,
  chainCoins,
} from '@screens/Swap/swapAssets';

const LOGO = 28;
const LOGO_OVERLAP = -8;

/** The coin a row opens Swap with; with `several` on the chain, the row names none of them. */
type ContactCoin = { coin: TokenEntryType; several: boolean };

/** What the contact swaps with in each direction; a direction SwapKit does not route has none. */
export type SwapCoins =
  | { kind: 'loading' }
  | { kind: 'loaded'; to?: ContactCoin; from?: ContactCoin };

const contactCoin = (
  tokens: TokenEntryType[],
  chain: string,
): ContactCoin | undefined => {
  const coin = chainCoin(tokens, chain);
  return coin && { coin, several: chainCoins(tokens, chain).length > 1 };
};

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
      to: contactCoin(outbound, chain),
      from: contactCoin(inbound, chain),
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

const Zec = () => {
  const { colors } = useTheme();
  return (
    <TokenLogo
      token={ZEC_TOKEN_ENTRY}
      size={LOGO}
      surfaceColor={colors.bgCanvas}
    />
  );
};

const Other = ({ chain, coin }: { chain: string; coin: ContactCoin }) => {
  const { colors } = useTheme();
  return coin.several ? (
    <ChainLogo chain={chain} size={LOGO} />
  ) : (
    <TokenLogo token={coin.coin} size={LOGO} surfaceColor={colors.bgCanvas} />
  );
};

const Pair = ({ from, to }: { from: React.ReactNode; to: React.ReactNode }) => (
  <View style={{ flexDirection: 'row' }}>
    {from}
    <View style={{ marginLeft: LOGO_OVERLAP }}>{to}</View>
  </View>
);

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
  /** `key` names the coin; `key-any` is the same text for a chain with several. */
  const sayFor = (key: string, coin: ContactCoin, suffix = '') =>
    coin.several
      ? say(`${key}-any${suffix}`)
      : say(`${key}${suffix}`, coin.coin);
  const other = (coin: ContactCoin) => (
    <Other chain={contact.swapChain} coin={coin} />
  );

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
      {coins.kind === 'loaded' && (!!coins.to || !!coins.from) && (
        <View style={{ marginHorizontal: space20 }}>
          <Card flush>
            {!!coins.to && (
              <ListRow
                testID="addressbook.swap.to"
                leading={<Pair from={<Zec />} to={other(coins.to)} />}
                title={sayFor('addressbook.swap-to', coins.to)}
                subtitle={sayFor('addressbook.swap-to', coins.to, '-line')}
                chevron
                onPress={() =>
                  coins.to &&
                  onChoose(SwapDirectionEnum.Outbound, coins.to.coin)
                }
              />
            )}
            {!!coins.from && (
              <ListRow
                testID="addressbook.swap.from"
                leading={<Pair from={other(coins.from)} to={<Zec />} />}
                title={sayFor('addressbook.swap-from', coins.from)}
                subtitle={sayFor('addressbook.swap-from', coins.from, '-line')}
                chevron
                divider={!!coins.to}
                onPress={() =>
                  coins.from &&
                  onChoose(SwapDirectionEnum.Inbound, coins.from.coin)
                }
              />
            )}
          </Card>
        </View>
      )}
    </View>
  );
};

export default ContactSwapSheet;
