/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { space8, space20, space32 } from '@app/theme';

import Clipboard from '@react-native-clipboard/clipboard';
import { HomeTabScreenProps, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Header from '@ui/widgets/Header';
import AppSheet from '@ui/primitives/AppSheet';
import AppSheetModal from '@ui/primitives/AppSheetModal';

import { Route, SnackbarDurationEnum } from '@app/AppState';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';
import VerifyAddress from './components/VerifyAddress';
import AddressCard from './components/AddressCard';
import NewAddressTag from '@ui/widgets/NewAddressTag';
import { useResult } from '@app/navigation/results';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import { usePinnedAddress } from '@app/hooks/usePinnedAddress';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ListIcon } from '@ui/primitives/Icons/ListIcon';
import { PlusIcon } from '@ui/primitives/Icons/PlusIcon';
import { useOwnAddresses } from './ownAddresses';
import { onTabScroll } from '@app/navigation/tabBarScroll';
import { PANEL_TOP } from '@ui/widgets/Header/Header';
import { useReceiveSelection } from './useReceiveSelection';

type ReceiveProps = HomeTabScreenProps<'Receive'>;

type SheetType = 'NA' | 'VA' | 'NAT';

/**
 * Receive: one of the wallet's addresses on a card with its QR. It opens on
 * the pinned address, or on the newest shielded one; a new address becomes
 * the current one. The list icon opens Your addresses, the "+" a new one.
 */
const Receive: React.FunctionComponent<ReceiveProps> = () => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const {
    setAddressBook,
    translate,
    addresses,
    addressBook,
    defaultUnifiedAddress,
    addLastSnackbar,
    setPrivacyOption,
  } = context;
  const t = (key: string) => translate(key) as string;

  const [sheetType, setSheetType] = useState<SheetType | null>(null);

  const [containerH, setContainerH] = useState<number>(0);

  const { shielded, transparent } = useOwnAddresses();
  const all = useMemo(
    () => [...shielded, ...transparent],
    [shielded, transparent],
  );
  const { loaded: pinLoaded, pin, setPin } = usePinnedAddress();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const receiveSheetRef = useRef<BottomSheet>(null);
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  const keyboardHeight = useKeyboardHeight();
  useDismissSheetsOnBlur();

  // Fixed under the header's icons, as Swap: no stops to drag between.
  const receiveSnapPoints = useMemo(
    () => [containerH > 0 ? containerH - PANEL_TOP : '93%'],
    [containerH],
  );

  const [selected, setSelected] = useReceiveSelection(
    shielded,
    transparent,
    pin,
    pinLoaded,
  );
  useResult('receive.pick', setSelected);

  const current = all.find(a => a.address === selected) ?? all[0];
  const tag = current
    ? (addressBook.find(entry => entry.address === current.address)?.label ??
      '')
    : '';

  const show = useCallback((type: SheetType) => {
    setSheetType(type);
    bottomSheetRef.current?.present();
  }, []);

  const hide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, []);

  const togglePin = () => {
    if (!current) {
      return;
    }
    if (pin === current.address) {
      setPin('');
      addLastSnackbar(t('receive.unpinned'), SnackbarDurationEnum.short);
    } else {
      setPin(current.address);
      addLastSnackbar(t('receive.pinned'), SnackbarDurationEnum.short);
    }
  };

  const doCopy = () => {
    Clipboard.setString(current?.address ?? '');
    addLastSnackbar(t('history.addresscopied'), SnackbarDurationEnum.short);
  };

  const modalTitle =
    sheetType === 'NA'
      ? t('receive.new-title')
      : sheetType === 'VA'
        ? t('receive.verify-title')
        : '';

  const xHeader = (
    <TitleBar
      title={modalTitle}
      right={{ icon: XIcon, accessibilityLabel: t('close'), onPress: hide }}
    />
  );

  const receiveHeader = (
    <TitleBar
      title={t('receive.title')}
      left={{
        icon: ListIcon,
        testID: 'receive.addresses',
        accessibilityLabel: t('receive.your-addresses'),
        onPress: () =>
          navigation.navigate(Route.AddressList, { current: current?.address }),
      }}
      right={{
        icon: PlusIcon,
        testID: 'receive.new',
        accessibilityLabel: t('receive.new-title'),
        onPress: () => show('NA'),
      }}
    />
  );

  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      testID="receive.title"
    >
      <View
        accessible={true}
        accessibilityLabel={t('receive.title-acc')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <Header
          title={''}
          noBalance={true}
          noSyncingStatus={true}
          noPrivacy={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          showMessagesIcon={true}
        />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        {containerH > 0 && (
          <AppSheet
            ref={receiveSheetRef}
            snapPoints={receiveSnapPoints}
            animateOnMount={false}
            header={receiveHeader}
          >
            <ScrollView
              onScroll={onTabScroll}
              scrollEventThrottle={16}
              bounces={false}
              alwaysBounceVertical={false}
              contentContainerStyle={{
                paddingHorizontal: space20,
                paddingTop: space8,
                paddingBottom: 100,
              }}
            >
              {!!addresses && !!defaultUnifiedAddress && current ? (
                <AddressCard
                  address={current}
                  tag={tag}
                  pinned={pin === current.address}
                  onTogglePin={togglePin}
                  onCopy={doCopy}
                  onVerify={() => show('VA')}
                  onAddTag={() => show('NAT')}
                />
              ) : (
                <Text
                  variant="body"
                  tone="muted"
                  style={{ textAlign: 'center', marginTop: space32 }}
                >
                  {t('receive.noaddress')}
                </Text>
              )}
            </ScrollView>
          </AppSheet>
        )}
      </Animated.View>
      <AppSheetModal
        ref={bottomSheetRef}
        header={sheetType === 'NAT' ? undefined : xHeader}
        handle={sheetType === 'NAT'}
        contentStyle={
          keyboardHeight > 0
            ? { paddingBottom: keyboardHeight + space20 }
            : undefined
        }
      >
        {sheetType === 'NA' && (
          <NewAddress closeSheet={hide} setAddressBook={setAddressBook} />
        )}
        {sheetType === 'NAT' && (
          <NewAddressTag
            address={current?.address ?? ''}
            closeSheet={hide}
            setAddressBook={setAddressBook}
          />
        )}
        {sheetType === 'VA' && <VerifyAddress closeSheet={hide} />}
      </AppSheetModal>
    </View>
  );
};

export default Receive;
