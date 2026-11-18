import React, { useContext } from 'react';
import { ChainNameEnum, Route, TranslateType } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { navigateWallet } from '@app/navigation/navigate';
import { useAddWalletDraft } from '@app/services/addWalletDraft';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import ServerAction from '@ui/widgets/ServerAction';

/** A wallet's name, at most this long. */
export const NAME_MAX = 24;

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
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
}) {
  const { translate } = useContext(ContextAppLoaded);
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
