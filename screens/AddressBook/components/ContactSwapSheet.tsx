/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import { space4, space8, space16, useTheme } from '@app/theme';
import { AddressBookFileClass } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { SwapDirectionEnum } from '@app/swap';
import type { SwapAssetType } from '@app/swap';
import Utils from '@app/utils';
import ListRow from '@ui/primitives/ListRow';
import Text from '@ui/primitives/Text';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import { ZEC_ASSET, tokenEntryOf } from '@screens/Swap/swapAssets';

const LOGO = 28;
const LOGO_OVERLAP = -8;

/** An address book swap string, with the contact and its coin filled in. */
export const contactSwapText = (
  template: string,
  contact: AddressBookFileClass,
  asset: SwapAssetType,
): string =>
  template
    .replace('{name}', contact.label)
    .replace(/\{coin\}/g, asset.ticker ?? asset.symbol)
    .replace('{chain}', chainDisplayName(contact.swapChain));

const Pair = ({ from, to }: { from: SwapAssetType; to: SwapAssetType }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      <TokenLogo
        token={tokenEntryOf(from)}
        size={LOGO}
        surfaceColor={colors.bgSurface}
      />
      <View style={{ marginLeft: LOGO_OVERLAP }}>
        <TokenLogo
          token={tokenEntryOf(to)}
          size={LOGO}
          surfaceColor={colors.bgSurface}
        />
      </View>
    </View>
  );
};

/** Which way a swap with a contact goes; the title bar names the contact. */
const ContactSwapSheet: React.FunctionComponent<{
  contact: AddressBookFileClass;
  asset: SwapAssetType;
  onChoose: (direction: SwapDirectionEnum) => void;
}> = ({ contact, asset, onChoose }) => {
  const { translate } = useContext(ContextAppLoaded);
  const say = (key: string) =>
    contactSwapText(translate(key) as string, contact, asset);

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
      <ListRow
        testID="addressbook.swap.to"
        leading={<Pair from={ZEC_ASSET} to={asset} />}
        title={say('addressbook.swap-to')}
        subtitle={say('addressbook.swap-to-line')}
        chevron
        onPress={() => onChoose(SwapDirectionEnum.Outbound)}
      />
      <ListRow
        testID="addressbook.swap.from"
        leading={<Pair from={asset} to={ZEC_ASSET} />}
        title={say('addressbook.swap-from')}
        subtitle={say('addressbook.swap-from-line')}
        chevron
        divider
        onPress={() => onChoose(SwapDirectionEnum.Inbound)}
      />
    </View>
  );
};

export default ContactSwapSheet;
