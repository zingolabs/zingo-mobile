/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, Keyboard } from 'react-native';
import { space8, space16, space20 } from '@app/theme';
import {
  AddressBookFileClass,
  ReceiverEnum,
  SnackbarDurationEnum,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import RadioRow, { RadioList } from '@ui/widgets/RadioRow';
import {
  createNewTransparentAddress,
  createNewUnifiedAddress,
} from '@app/walletBackend';
import { RPCUnifiedAddressType } from '@app/walletBackend/types/RPCUnifiedAddressType';
import { RPCTransparentAddressType } from '@app/walletBackend/types/RPCTransparentAddressType';
import Utils from '@app/utils';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import TextField from '@ui/primitives/TextField';

type NewKind = 'orchard' | 'orchardSapling' | 'sapling' | 'transparent';

/** The kinds a new address can be, with the receivers each one asks for. */
const KINDS: {
  kind: NewKind;
  title: string;
  sub: string;
  receivers: string;
  pill?: 'best' | 'public';
}[] = [
  {
    kind: 'orchard',
    title: 'receive.shielded-orchard',
    sub: 'receive.new-orchard-sub',
    receivers: ReceiverEnum.o,
    pill: 'best',
  },
  {
    kind: 'orchardSapling',
    title: 'receive.shielded-orchard-sapling',
    sub: 'receive.new-orchard-sapling-sub',
    receivers: ReceiverEnum.o + ReceiverEnum.z,
  },
  {
    kind: 'sapling',
    title: 'receive.shielded-sapling',
    sub: 'receive.new-sapling-sub',
    receivers: ReceiverEnum.z,
  },
  {
    kind: 'transparent',
    title: 'receive.kind-transparent',
    sub: 'receive.new-transparent-sub',
    receivers: '',
    pill: 'public',
  },
];

type NewAddressProps = {
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

/**
 * A new address of the wallet: its kind as a radio list, Orchard marked
 * Best and Transparent marked Public, and an optional tag. Receive shows
 * it the moment it turns up in the wallet's addresses.
 */
const NewAddress: React.FunctionComponent<NewAddressProps> = ({
  closeSheet,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const t = (key: string) => translate(key) as string;

  const [label, setLabel] = useState<string>('');
  const [kind, setKind] = useState<NewKind>('orchard');
  const [creating, setCreating] = useState(false);

  const createAddress = async () => {
    const receivers = KINDS.find(k => k.kind === kind)?.receivers ?? '';
    setCreating(true);
    try {
      const result = receivers
        ? await createNewUnifiedAddress(receivers)
        : await createNewTransparentAddress();
      if (!result.ok) {
        addLastSnackbar(
          t('receive.transparent.new-error'),
          SnackbarDurationEnum.short,
        );
      } else if (label.trim()) {
        const parsed: RPCUnifiedAddressType | RPCTransparentAddressType =
          JSON.parse(result.value);
        const ab = await AddressBookFileImpl.writeAddressBookItem(
          label.trim(),
          parsed.encoded_address,
          Utils.generateColorList(1)[0],
          true,
          context.walletChainName || context.server.chainName,
        );
        setAddressBook(ab);
      }
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
    }
    setCreating(false);
    setLabel('');
    Keyboard.dismiss();
    setTimeout(() => {
      closeSheet();
    }, 100);
  };

  return (
    <View testID="receive.new-sheet" style={{ paddingHorizontal: space20 }}>
      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('receive.new-sub')}
      </Text>
      <Text
        variant="caption"
        style={{ fontWeight: '600', marginTop: space16, marginBottom: space8 }}
      >
        {t('receive.new-type')}
      </Text>
      <RadioList>
        {KINDS.map((k, index) => (
          <RadioRow
            key={k.kind}
            testID={`receive.new-kind.${k.kind}`}
            first={index === 0}
            title={t(k.title)}
            sub={t(k.sub)}
            pill={
              k.pill === 'best'
                ? { text: t('receive.best'), tone: 'accent' }
                : k.pill === 'public'
                  ? { text: t('receive.public'), tone: 'transparent' }
                  : undefined
            }
            selected={kind === k.kind}
            onPress={() => setKind(k.kind)}
          />
        ))}
      </RadioList>
      <View style={{ marginTop: space16 }}>
        <TextField
          testID="receive.new-tag"
          label={t('addressbook.tag')}
          labelRight={
            <Text variant="caption" tone="muted">
              {t('receive.optional')}
            </Text>
          }
          placeholder={t('receive.tag-placeholder')}
          value={label}
          onChangeText={setLabel}
          maxLength={50}
          clearable
          clearLabel={t('clear')}
        />
      </View>
      <View style={{ marginTop: space20 }}>
        <ButtonStack>
          <Button
            variant="quiet"
            title={t('cancel')}
            onPress={() => {
              setLabel('');
              Keyboard.dismiss();
              setTimeout(() => {
                closeSheet();
              }, 100);
            }}
          />
          <Button
            testID="receive.new-create"
            variant="primary"
            title={t('receive.create')}
            busy={creating}
            onPress={createAddress}
          />
        </ButtonStack>
      </View>
    </View>
  );
};

export default React.memo(NewAddress);
