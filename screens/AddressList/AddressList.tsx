/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { slopFor, useTheme } from '@app/theme';
import { AddressKindEnum, SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { deliver } from '@app/navigation/results';
import { usePinnedAddress } from '@app/hooks/usePinnedAddress';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import FullPanel from '@ui/widgets/FullPanel';
import NewAddressTag from '@ui/widgets/NewAddressTag';
import RadioRow, { RadioList } from '@ui/widgets/RadioRow';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { TagIcon } from '@ui/primitives/Icons/TagIcon';
import { PinButton } from '@screens/Receive/components/AddressCard';
import { addressKindKey } from '@screens/Receive/addressKind';
import { OwnAddress, useOwnAddresses } from '@screens/Receive/ownAddresses';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
/** Long enough for the radio to show the pick before the panel leaves. */
const PICK_LEAVE_MS = 260;

type AddressListProps = NativeStackScreenProps<
  AppDrawerParamList,
  'AddressList'
>;

/**
 * Your addresses: every address of the wallet in two radio groups, the
 * shielded ones and the transparent ones, the pinned one first in its
 * group. Picking one shows it in Receive; the pin and the tag of each row
 * can be changed right here.
 */
const AddressList: React.FunctionComponent<AddressListProps> = ({
  navigation,
  route,
}) => {
  const { translate, addressBook, setAddressBook, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const { shielded, transparent } = useOwnAddresses();
  const { pin, setPin } = usePinnedAddress();
  const [current, setCurrent] = useState<string>(route.params?.current ?? '');
  const [tagging, setTagging] = useState<string>('');
  const tagSheetRef = useRef<BottomSheetModal>(null);

  const tagOf = (address: string) =>
    addressBook.find(entry => entry.address === address);

  const close = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const pick = (address: string) => {
    setCurrent(address);
    deliver('receive.pick', address);
    setTimeout(close, PICK_LEAVE_MS);
  };

  const togglePin = (address: string) => {
    if (pin === address) {
      setPin('');
      addLastSnackbar(t('receive.unpinned'), SnackbarDurationEnum.short);
    } else {
      setPin(address);
      addLastSnackbar(t('receive.pinned'), SnackbarDurationEnum.short);
    }
  };

  const openTag = (address: string) => {
    setTagging(address);
    tagSheetRef.current?.present();
  };
  const closeTag = () => {
    Keyboard.dismiss();
    tagSheetRef.current?.dismiss();
    setTagging('');
  };

  const row = (address: OwnAddress, index: number) => {
    const tag = tagOf(address.address)?.label ?? '';
    const kind = t(addressKindKey(address));
    const isT = address.addressKind === AddressKindEnum.t;
    return (
      <RadioRow
        key={address.address}
        testID={`addresslist.row.${address.address}`}
        first={index === 0}
        title={tag || kind}
        pill={isT ? { text: t('receive.public'), tone: 'warning' } : undefined}
        sub={
          <>
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: colors.fgDefault,
              }}
            >
              {Utils.trimToSmall(address.address, 8)}
            </Text>
            {tag ? ` · ${kind}` : ''}
          </>
        }
        selected={address.address === current}
        onPress={() => pick(address.address)}
        trailing={
          <>
            <PinButton
              pinned={pin === address.address}
              onPress={() => togglePin(address.address)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                tag ? 'receive.edit-tag' : 'addressbook.add-tag',
              )}
              hitSlop={slopFor(40)}
              onPress={() => openTag(address.address)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
              })}
            >
              {tag ? (
                <PencilIcon size={16} color={colors.fgMuted} />
              ) : (
                <TagIcon size={16} color={colors.fgMuted} />
              )}
            </Pressable>
          </>
        }
      />
    );
  };

  /** The pinned address goes first in its group; the rest keep their order. */
  const pinnedFirst = <T extends OwnAddress>(list: T[]) =>
    [...list].sort(
      (a, b) => Number(b.address === pin) - Number(a.address === pin),
    );

  const group = (title: string, note: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 8,
        marginHorizontal: 4,
      }}
    >
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '700' }}>
        {title}
      </Text>
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    </View>
  );

  return (
    <FullPanel
      title={t('receive.your-addresses')}
      onBack={close}
      testID="addresslist"
    >
      <Text
        variant="bodySmall"
        tone="muted"
        style={{ marginHorizontal: 2, marginTop: 4, lineHeight: 18 }}
      >
        {t('receive.addresses-lead')}
      </Text>
      {group(
        t('receive.group-shielded'),
        t('receive.group-count').replace('{n}', String(shielded.length)),
      )}
      <RadioList testID="addresslist.shielded">
        {pinnedFirst(shielded).map(row)}
      </RadioList>
      {transparent.length > 0 && (
        <>
          {group(t('receive.group-transparent'), t('receive.public-note'))}
          <RadioList testID="addresslist.transparent">
            {pinnedFirst(transparent).map(row)}
          </RadioList>
        </>
      )}
      <AppSheetModal ref={tagSheetRef} handle>
        {!!tagging && (
          <NewAddressTag
            address={tagging}
            current={tagOf(tagging)}
            closeSheet={closeTag}
            setAddressBook={setAddressBook}
          />
        )}
      </AppSheetModal>
    </FullPanel>
  );
};

export default AddressList;
