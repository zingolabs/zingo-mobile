/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';
import {
  iconSize,
  radiusPill,
  space8,
  space16,
  space20,
  useTheme,
} from '@app/theme';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';
import { ChainNameEnum, Route, TranslateType } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { navigateWallet } from '@app/navigation/navigate';
import { useAddWalletDraft } from '@app/services/addWalletDraft';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import ServerAction from '@ui/widgets/ServerAction';

/** A wallet's name, at most this long. */
export const NAME_MAX = 24;
const HERO_DISC = 56;

/** "Wallet n" in the app's language with the lowest n no wallet uses. */
export function defaultWalletName(
  translate: (key: string) => TranslateType,
  names: string[],
): string {
  const template = translate('wallets.default-name') as string;
  let n = 1;
  while (names.includes(template.replace('{n}', String(n)))) {
    n++;
  }
  return template.replace('{n}', String(n));
}

/** The bar's server action of a wallet being added: it opens Server on the draft. */
export function DraftServerAction() {
  const { translate } = useContext(ContextAppLoaded);
  const draft = useAddWalletDraft();
  const chain =
    draft.keyChain.kind === 'key'
      ? draft.keyChain.chain
      : draft.server.chainName;
  return (
    <ServerAction
      testID="addwallet.server"
      network={
        chain === ChainNameEnum.mainChainName
          ? ''
          : (translate(`settings.value-chainname-${chain}`) as string)
      }
      dot={draft.server.kind === 'offline' ? 'offline' : 'set'}
      accessibilityLabel={translate('add.server-acc') as string}
      onPress={() =>
        navigateWallet({ screen: Route.Server, params: { draft: true } })
      }
    />
  );
}

/** The optional name of a wallet being added; empty takes the placeholder. */
export function NameField({
  value,
  onChange,
  placeholder,
  translate,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  translate: (key: string) => TranslateType;
}) {
  return (
    <TextField
      testID="addwallet.name"
      label={translate('wallets.name') as string}
      labelRight={
        <Text variant="caption" tone="muted">
          {translate('add.optional') as string}
        </Text>
      }
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      maxLength={NAME_MAX}
    />
  );
}

/** What a wallet being added is made from: its mark in a 56 disc and one line under it. */
export function WalletHero({
  from,
  lead,
}: {
  from: 'create' | 'seed' | 'key';
  lead: string;
}) {
  const { colors } = useTheme();
  const viewOnly = from === 'key';
  const color = viewOnly ? colors.fgViewOnly : colors.fgAccent;
  return (
    <View style={{ alignItems: 'center', marginBottom: space20 }}>
      <View
        style={{
          width: HERO_DISC,
          height: HERO_DISC,
          borderRadius: radiusPill,
          backgroundColor: viewOnly
            ? colors.bgViewOnlySubtle
            : colors.bgAccentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {from === 'create' ? (
          <WalletIcon size={iconSize} color={color} />
        ) : from === 'seed' ? (
          <SproutIcon size={iconSize} color={color} />
        ) : (
          <SnowflakeIcon size={iconSize} color={color} />
        )}
      </View>
      <Text
        variant="bodySmall"
        tone="muted"
        style={{
          textAlign: 'center',
          marginTop: space8,
          marginHorizontal: space16,
        }}
      >
        {lead}
      </Text>
    </View>
  );
}
