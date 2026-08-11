/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import SelectBottomSheet from '../../ui/widgets/SelectBottomSheet';

import Clipboard from '@react-native-clipboard/clipboard';
import SingleAddress from '../../ui/widgets/SingleAddress';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../../ui/widgets/Header';
import BoldText from '../../ui/primitives/BoldText';
import SheetRim from '../../ui/primitives/SheetRim';

import {
  AddressKindEnum,
  ChainNameEnum,
  CurrencyEnum,
  ModeEnum,
  SecurityType,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressBookFileClass,
  ScreenEnum,
  SnackbarDurationEnum,
  RouteEnum,
} from '../../app/AppState';
import { RPCAddressScopeEnum } from '../../app/walletBackend/enums/RPCAddressScopeEnum';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';
import VerifyAddress from './components/VerifyAddress';
import NewAddressTag from './components/NewAddressTag';
import TransparentWarning from './components/TransparentWarning';
import ExpandedAddress from './components/ExpandedAddress';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '../../app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '../../app/hooks/useOptionsPanelSheetSlide';
import { usePriceSnapAutoClose } from '../../app/hooks/usePriceSnapAutoClose';
import { safeSnapToIndex } from '../../app/utils/safeSnapToIndex';

type ReceiveProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Receive
> & {
  toggleMenuDrawer: () => void;
  alone: boolean;
  setSecurityOption: (s: SecurityType) => Promise<void>;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  // side menu
  toggleMenuDrawer,
  navigation,
  // balance
  // privacy
  // shielding
  // for receive
  alone: _alone,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addresses,
    defaultUnifiedAddress,
    mode,
    addLastSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Receive;

  const [index, setIndex] = useState<number>(0);
  const [sheetType, setSheetType] = useState<
    'NA' | 'VA' | 'NAT' | 'TW' | 'EA' | null
  >(null);

  // measured dynamically to compute receive sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);
  const [priceRowH, setPriceRowH] = useState<number>(0);

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [tAddr, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [tAddrIndex, setTAddrIndex] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const scopeSelectRef = useRef<BottomSheetModal>(null);
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
    const withUsd =
      isMainChain && context.currency === CurrencyEnum.USDCurrency;
    if (!withUsd) {
      setUsdRowH(0);
    }
  }, [context.currency, context.server.chainName]);

  const receiveSnapPoints = useMemo(() => {
    const isMainChain =
      context.server.chainName === ChainNameEnum.mainChainName;
    const withUsd =
      isMainChain && context.currency === CurrencyEnum.USDCurrency;
    if (containerH <= 0 || headerH <= 0) {
      return withUsd ? ['85%', '89%', '93%'] : ['89%', '93%'];
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
    if (withUsd && usdRowH > 0) {
      points.push(snapMid);
    }
    points.push(snapMax);
    return points;
  }, [
    context.currency,
    context.server.chainName,
    containerH,
    headerH,
    usdRowH,
    priceRowH,
  ]);

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

  // Tapping the price fetch button reveals the header PriceRow (smallest snap).
  // The auto-close timer armed by usePriceSnapAutoClose returns it afterwards.
  const revealPrice = useCallback(() => {
    if (priceSnapIndex === null) return;
    safeSnapToIndex(receiveSheetRef, priceSnapIndex, receiveSnapPoints.length);
  }, [priceSnapIndex, receiveSnapPoints.length]);

  const show = useCallback((_sheetType: 'NA' | 'VA' | 'NAT' | 'TW' | 'EA') => {
    setSheetType(_sheetType);
    bottomSheetRef.current?.present();
  }, []);

  const hide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, []);

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      // we offering now two types:
      // 1. UA
      // 2. T
      const uAdd =
        addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.addressKind === AddressKindEnum.u,
        ) || [];
      // we are filtering only the `external` addresses... for now.
      const tAdd =
        addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.addressKind === AddressKindEnum.t &&
            a.scope === RPCAddressScopeEnum.external,
        ) || [];
      setUAddr(uAdd as UnifiedAddressClass[]);
      setTAddr(tAdd as TransparentAddressClass[]);
      setUAddrIndex(uAdd.length > 0 ? uAdd.length - 1 : 0);
      setTAddrIndex(tAdd.length > 0 ? tAdd.length - 1 : 0);
    }
  }, [addresses]);

  const isAdvanced = mode !== ModeEnum.basic;
  const canPickScope = isAdvanced && tAddr && tAddr.length > 0;

  const scopeItems = useMemo(
    () => [
      { label: translate('receive.scope-shielded') as string, value: 'u' },
      { label: translate('receive.scope-transparent') as string, value: 't' },
    ],
    [translate],
  );

  const modalTitle = useMemo(() => {
    switch (sheetType) {
      case 'NA':
        return (
          index === 0
            ? translate('receive.newu-option')
            : translate('receive.transparent.newt-option')
        ) as string;
      case 'VA':
        return translate('receive.verify') as string;
      case 'NAT':
        // Receive only deals with this wallet's own addresses.
        return translate('addressbook.add-tag') as string;
      case 'TW':
        return translate('receive.modal-transparent.title') as string;
      case 'EA':
        return translate('receive.title-address') as string;
      default:
        return '';
    }
  }, [sheetType, index, translate]);

  const renderModalHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left spacer matches the X Pressable width (14×2 + 20 = 48)
              so the title is geometrically centered in the row. */}
          <View style={{ width: 48 }} />
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
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
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.fgMuted} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, modalTitle, hide],
  );

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const doCopy = () => {
    Clipboard.setString(
      index === 0 && uAddrIndex !== null
        ? uAddr[uAddrIndex].address
        : index === 1 && tAddrIndex !== null
          ? tAddr[tAddrIndex].address
          : '',
    );
    addLastSnackbar(
      translate('history.addresscopied') as string,
      SnackbarDurationEnum.short,
    );
  };

  // Resolve the address currently shown based on the scope index.
  const currentAddress = useMemo(() => {
    if (index === 0) {
      if (uAddrIndex !== null && uAddr.length > 0) {
        return uAddr[uAddrIndex];
      }
      return new UnifiedAddressClass(
        0,
        translate('receive.noaddress') as string,
        AddressKindEnum.u,
        false,
        false,
        false,
      );
    }
    if (tAddrIndex !== null && tAddr.length > 0) {
      return tAddr[tAddrIndex];
    }
    return new TransparentAddressClass(
      0,
      translate('receive.noaddress') as string,
      AddressKindEnum.t,
      RPCAddressScopeEnum.external,
    );
  }, [index, uAddrIndex, tAddrIndex, uAddr, tAddr, translate]);

  const setCurrentAddrIndex = index === 0 ? setUAddrIndex : setTAddrIndex;
  const currentTotal = index === 0 ? uAddr.length : tAddr.length;
  const currentAddrIndex = index === 0 ? (uAddrIndex ?? 0) : (tAddrIndex ?? 0);

  const returnPage = (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      testID="receive.title"
    >
      <View
        accessible={true}
        accessibilityLabel={translate('receive.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}
        onLayout={e => setHeaderH(e.nativeEvent.layout.height)}
      >
        <Header
          title={''}
          screenName={screenName}
          toggleMenuDrawer={toggleMenuDrawer}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          showMessagesIcon={true}
          onUsdRowLayout={setUsdRowH}
          onPriceRowLayout={setPriceRowH}
          onManualFetchPrice={revealPrice}
        />
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        {sheetMeasured && (
          <BottomSheet
            ref={receiveSheetRef}
            accessible={false}
            snapPoints={receiveSnapPoints}
            index={0}
            onChange={i => {
              internalSnapIndexRef.current = i;
              onPriceSnapChange(i);
            }}
            enableDynamicSizing={false}
            enablePanDownToClose={false}
            enableContentPanningGesture={true}
            keyboardBehavior={'interactive'}
            keyboardBlurBehavior={'restore'}
            android_keyboardInputMode={'adjustResize'}
            backgroundStyle={{
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
            }}
            handleComponent={null}
          >
            <View style={{ flex: 1 }}>
              {/* Sheet header rendered as content (not via handleComponent) so
              index-change re-renders don't remount the inner select trigger. */}
              <View
                style={{
                  paddingTop: 8,
                  paddingBottom: 6,
                  paddingHorizontal: 16,
                  backgroundColor: colors.bgSurface,
                  borderTopLeftRadius: 40,
                  borderTopRightRadius: 40,
                }}
              >
                <SheetRim />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: 46 }} />
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {canPickScope ? (
                      <Pressable
                        onPress={() => scopeSelectRef.current?.present()}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 2,
                          paddingVertical: 4,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faChevronDown}
                          size={14}
                          color={colors.fgMuted}
                          style={{ marginRight: 8 }}
                        />
                        <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
                          {
                            (index === 0
                              ? translate('receive.scope-shielded')
                              : translate(
                                  'receive.scope-transparent',
                                )) as string
                          }
                        </BoldText>
                      </Pressable>
                    ) : (
                      <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
                        {
                          (index === 0
                            ? translate('receive.scope-shielded')
                            : translate('receive.scope-transparent')) as string
                        }
                      </BoldText>
                    )}
                  </View>
                  {isAdvanced ? (
                    <Pressable
                      onPress={() => show('NA')}
                      hitSlop={8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faPlus}
                        size={18}
                        color={colors.fgMuted}
                      />
                    </Pressable>
                  ) : (
                    <View style={{ width: 46 }} />
                  )}
                </View>
              </View>
              {!!addresses && !!defaultUnifiedAddress && (
                <SingleAddress
                  address={currentAddress}
                  index={currentAddrIndex}
                  setIndex={setCurrentAddrIndex}
                  total={currentTotal}
                  show={show}
                  hasTransparent={index === 0 && tAddr && tAddr.length > 0}
                />
              )}
            </View>
          </BottomSheet>
        )}
      </Animated.View>
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderModalHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
          }}
        >
          {sheetType === 'NA' && (
            <NewAddress
              addressKind={index === 0 ? AddressKindEnum.u : AddressKindEnum.t}
              closeSheet={hide}
              setAddressBook={setAddressBook}
              screenName={screenName}
            />
          )}
          {sheetType === 'NAT' && (
            <NewAddressTag
              address={
                index === 0 && uAddrIndex !== null
                  ? uAddr[uAddrIndex].address
                  : index === 1 && tAddrIndex !== null
                    ? tAddr[tAddrIndex].address
                    : ''
              }
              own={true}
              closeSheet={hide}
              setAddressBook={setAddressBook}
            />
          )}
          {sheetType === 'VA' && (
            <VerifyAddress
              closeSheet={hide}
              screenName={screenName}
              navigation={navigation}
            />
          )}
          {sheetType === 'TW' && (
            <TransparentWarning
              closeSheet={hide}
              onSuccess={() => {
                setIndex(1);
              }}
            />
          )}
          {sheetType === 'EA' && (
            <ExpandedAddress
              onCopy={doCopy}
              closeSheet={hide}
              title={translate('receive.title-address') as string}
              button={translate('receive.copy-address-button') as string}
              address={
                index === 0 && uAddrIndex !== null
                  ? uAddr[uAddrIndex].address
                  : index === 1 && tAddrIndex !== null
                    ? tAddr[tAddrIndex].address
                    : ''
              }
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
      <SelectBottomSheet
        ref={scopeSelectRef}
        title={translate('receive.select-scope-placeholder') as string}
        items={scopeItems}
        value={index === 0 ? 'u' : 't'}
        onChange={v => {
          if (v === 'u') {
            setIndex(0);
          } else if (v === 't') {
            setIndex(1);
          }
        }}
      />
    </View>
  );

  //console.log('render Receive - 4', uAddr, uAddrIndex, tAddr, tAddrIndex, defaultUnifiedAddress);

  return returnPage;
};

export default Receive;
