/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { slopFor, space20, useTheme } from '@app/theme';

import Clipboard from '@react-native-clipboard/clipboard';
import { HomeTabScreenProps, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Header from '@ui/widgets/Header';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import AppSheet from '@ui/primitives/AppSheet';
import AppSheetModal from '@ui/primitives/AppSheetModal';

import { ChainNameEnum, Route, SnackbarDurationEnum } from '@app/AppState';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';
import VerifyAddress from './components/VerifyAddress';
import AddressCard from './components/AddressCard';
import NewAddressTag from '@ui/widgets/NewAddressTag';
import { useResult } from '@app/navigation/results';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import { usePriceSnapAutoClose } from '@app/hooks/usePriceSnapAutoClose';
import { usePinnedAddress } from '@app/hooks/usePinnedAddress';
import { safeSnapToIndex } from '@app/utils/safeSnapToIndex';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ListIcon } from '@ui/primitives/Icons/ListIcon';
import { PlusIcon } from '@ui/primitives/Icons/PlusIcon';
import { useOwnAddresses } from './ownAddresses';
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
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;

  const [sheetType, setSheetType] = useState<SheetType | null>(null);

  // measured dynamically to compute receive sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);
  const [priceRowH, setPriceRowH] = useState<number>(0);

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

  // Receive sheet snap points — identical computation to History so both
  // screens feel the same when dragging.
  const TOP_ICONS_H = 55;
  const SNAP_GAP = 4;
  const BALANCE_SNAP_BUMP = 10;

  useEffect(() => {
    const isMainChain =
      context.server.chainName === ChainNameEnum.mainChainName;
    if (!isMainChain) {
      setUsdRowH(0);
    }
  }, [context.server.chainName]);

  const receiveSnapPoints = useMemo(() => {
    const isMainChain =
      context.server.chainName === ChainNameEnum.mainChainName;
    if (containerH <= 0 || headerH <= 0) {
      return isMainChain ? ['85%', '89%', '93%'] : ['89%', '93%'];
    }
    const snapBase = containerH - headerH - SNAP_GAP;
    const snapPrice = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapLow = Math.max(snapBase + priceRowH + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + priceRowH + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);
    const points: number[] = [];
    if (priceRowH > 0) {
      points.push(snapPrice);
    }
    points.push(snapLow);
    if (isMainChain && usdRowH > 0) {
      points.push(snapMid);
    }
    points.push(snapMax);
    return points;
  }, [context.server.chainName, containerH, headerH, usdRowH, priceRowH]);

  // The BottomSheet `index` prop is hardcoded to 0 below (NOT reactive). This
  // is critical: gorhom v5.2.14 has an internal useEffect that fires
  // `handleSnapToIndex(_providedIndex)` whenever the prop changes, but the
  // `detents` SharedValue (derived from snapPoints) only updates when the
  // underlying layoutState changes — NOT when the snapPoints prop closure
  // changes. So a reactive `index` racing with a snapPoints change crashes
  // with "out of the provided snap points range" using a stale detents array.
  // History/Send avoid the crash precisely because they hardcode `index={0}`.
  // We do the same and use a post-layout effect below to move to the desired
  // initial snap via the ref (which goes through `safeSnapToIndex` and so
  // tolerates whatever detents state gorhom currently has).
  const sheetMeasured = containerH > 0 && headerH > 0;
  // Track the sheet's internal snap index (updated via onChange). When
  // snapPoints shrinks (3 → 2) and that index is now out of range, clamp
  // it via the ref from an effect (post-commit, after BottomSheet has
  // processed the new snapPoints prop).
  const internalSnapIndexRef = useRef<number>(0);
  // One-shot: once the layout settles, snap to the natural "open" position
  // (the largest snap) via the ref. Done in an effect rather than via the
  // `index` prop so we don't trigger gorhom's reactive `_providedIndex`
  // effect at all.
  const didInitialSnapRef = useRef<boolean>(false);
  useEffect(() => {
    if (didInitialSnapRef.current) return;
    if (!sheetMeasured) return;
    if (receiveSnapPoints.length === 0) return;
    didInitialSnapRef.current = true;
    safeSnapToIndex(
      receiveSheetRef,
      receiveSnapPoints.length - 1,
      receiveSnapPoints.length,
    );
  }, [sheetMeasured, receiveSnapPoints]);
  useEffect(() => {
    if (internalSnapIndexRef.current >= receiveSnapPoints.length) {
      safeSnapToIndex(
        receiveSheetRef,
        receiveSnapPoints.length - 1,
        receiveSnapPoints.length,
      );
    }
  }, [receiveSnapPoints]);
  // Bump the sheet up by one when the PriceRow first appears so the user
  // stays at the same visual snap instead of landing on the new price snap.
  //
  // `receiveSnapPoints` is in the deps so the effect runs after React has
  // propagated the grown array to BottomSheet; clamp is the belt-and-braces
  // guard against any residual race that would otherwise crash with
  // "index ... out of the provided snap points range" — observed in the
  // wild on iOS / Play pre-launch review when the PriceRow appears during
  // first render.
  const prevHasPriceSnapRef = useRef<boolean>(false);
  useEffect(() => {
    const hasPriceSnap = priceRowH > 0;
    const justAppeared = !prevHasPriceSnapRef.current && hasPriceSnap;
    prevHasPriceSnapRef.current = hasPriceSnap;
    if (!justAppeared) return;
    safeSnapToIndex(
      receiveSheetRef,
      internalSnapIndexRef.current + 1,
      receiveSnapPoints.length,
    );
  }, [priceRowH, receiveSnapPoints]);

  const priceSnapIndex = priceRowH > 0 ? 0 : null;
  const onPriceSnapChange = usePriceSnapAutoClose(
    receiveSheetRef,
    priceSnapIndex,
    1,
    receiveSnapPoints.length,
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ width: 48 }} />
      <BoldText
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 15,
          lineHeight: 28,
          textAlign: 'center',
        }}
      >
        {modalTitle}
      </BoldText>
      <Pressable
        onPress={hide}
        hitSlop={8}
        style={{ paddingHorizontal: 14, paddingVertical: 4 }}
      >
        <XIcon size={20} color={colors.fgMuted} />
      </Pressable>
    </View>
  );

  const receiveHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
      }}
    >
      <Pressable
        testID="receive.addresses"
        accessibilityRole="button"
        accessibilityLabel={t('receive.your-addresses')}
        hitSlop={slopFor(24)}
        onPress={() =>
          navigation.navigate(Route.AddressList, { current: current?.address })
        }
        style={{ paddingHorizontal: 14, paddingVertical: 4 }}
      >
        <ListIcon size={20} color={colors.fgMuted} />
      </Pressable>
      <BoldText
        style={{ flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 28 }}
      >
        {t('receive.title')}
      </BoldText>
      <Pressable
        testID="receive.new"
        accessibilityRole="button"
        accessibilityLabel={t('receive.new-title')}
        onPress={() => show('NA')}
        hitSlop={slopFor(24)}
        style={{ paddingHorizontal: 14, paddingVertical: 4 }}
      >
        <PlusIcon size={20} color={colors.fgMuted} />
      </Pressable>
    </View>
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
        onLayout={e => setHeaderH(e.nativeEvent.layout.height)}
      >
        <Header
          title={''}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          showMessagesIcon={true}
          onUsdRowLayout={setUsdRowH}
          onPriceRowLayout={setPriceRowH}
        />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        {sheetMeasured && (
          <AppSheet
            ref={receiveSheetRef}
            snapPoints={receiveSnapPoints}
            onChange={i => {
              internalSnapIndexRef.current = i;
              onPriceSnapChange(i);
            }}
            enableContentPanningGesture
            header={receiveHeader}
          >
            <ScrollView
              bounces={false}
              alwaysBounceVertical={false}
              contentContainerStyle={{
                paddingHorizontal: space20,
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
                <RegText style={{ textAlign: 'center', marginTop: 50 }}>
                  {t('receive.noaddress')}
                </RegText>
              )}
            </ScrollView>
          </AppSheet>
        )}
      </Animated.View>
      <AppSheetModal
        ref={bottomSheetRef}
        header={sheetType === 'NAT' ? undefined : xHeader}
        handle={sheetType === 'NAT'}
        contentStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
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
