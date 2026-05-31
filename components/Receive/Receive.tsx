/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import RNPickerSelect from 'react-native-picker-select';

import Clipboard from '@react-native-clipboard/clipboard';
import SingleAddress from '../Components/SingleAddress';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import BoldText from '../Components/BoldText';

import {
  AddressKindEnum,
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
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';

type ReceiveProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Receive> & {
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
  const { translate, addresses, defaultUnifiedAddress, mode, addLastSnackbar } =
    context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Receive;

  const [index, setIndex] = useState<number>(0);
  const [sheetType, setSheetType] = useState<
    'NA' | 'VA' | 'NAT' | 'TW' | 'EA' | null
  >(null);

  // measured dynamically to compute receive sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [tAddr, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [tAddrIndex, setTAddrIndex] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const receiveSheetRef = useRef<BottomSheet>(null);
  const keyboardHeight = useKeyboardHeight();

  // Receive sheet snap points — identical computation to History so both
  // screens feel the same when dragging.
  const TOP_ICONS_H = 55;
  const SNAP_GAP = 4;
  const BALANCE_SNAP_BUMP = 10;

  useEffect(() => {
    const withUsd =
      context.currency === CurrencyEnum.USDCurrency ||
      context.currency === CurrencyEnum.USDTORCurrency;
    if (!withUsd) {
      setUsdRowH(0);
    }
  }, [context.currency]);

  const receiveSnapPoints = useMemo(() => {
    const withUsd =
      context.currency === CurrencyEnum.USDCurrency ||
      context.currency === CurrencyEnum.USDTORCurrency;
    if (containerH <= 0 || headerH <= 0) {
      return withUsd ? ['85%', '89%', '93%'] : ['89%', '93%'];
    }
    const snapBase = containerH - headerH - SNAP_GAP;
    const snapLow = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);
    if (withUsd && usdRowH > 0) {
      return [snapLow, snapMid, snapMax];
    }
    return [snapLow, snapMax];
  }, [context.currency, containerH, headerH, usdRowH]);

  const initialReceiveSnapIndex = useMemo(
    () => receiveSnapPoints.length - 1,
    [receiveSnapPoints],
  );

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
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
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
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
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
          showMessagesIcon={true}
          onUsdRowLayout={setUsdRowH}
        />
      </View>
      <BottomSheet
        ref={receiveSheetRef}
        accessible={false}
        snapPoints={receiveSnapPoints}
        index={initialReceiveSnapIndex}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={true}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={null}
      >
        <View style={{ flex: 1 }}>
          {/* Sheet header / "handle" visual — rendered as content (not via
              handleComponent) so re-renders triggered by index change don't
              remount the inner RNPickerSelect modal. */}
          <View
            style={{
              paddingTop: 8,
              paddingBottom: 6,
              paddingHorizontal: 16,
              backgroundColor: colors.bottomSheetBackground,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopColor: colors.bottomSheetBorder,
              borderLeftColor: colors.bottomSheetBorder,
              borderRightColor: colors.bottomSheetBorder,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ width: 28 }} />
              {canPickScope ? (
                <RNPickerSelect
                  value={index === 0 ? 'u' : 't'}
                  items={scopeItems}
                  placeholder={{
                    label: translate(
                      'receive.select-scope-placeholder',
                    ) as string,
                    value: null,
                    color: colors.primary,
                  }}
                  useNativeAndroidPickerStyle={false}
                  fixAndroidTouchableBug={true}
                  onValueChange={(v: string) => {
                    if (v === 'u') {
                      setIndex(0);
                    } else if (v === 't') {
                      setIndex(1);
                    }
                  }}
                >
                  <View
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
                      color={colors.zingo}
                      style={{ marginRight: 8 }}
                    />
                    <BoldText
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        lineHeight: 28,
                        textAlign: 'center',
                      }}
                    >
                      {
                        (index === 0
                          ? translate('receive.scope-shielded')
                          : translate('receive.scope-transparent')) as string
                      }
                    </BoldText>
                  </View>
                </RNPickerSelect>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    paddingVertical: 4,
                  }}
                >
                  <BoldText
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      lineHeight: 28,
                      textAlign: 'center',
                    }}
                  >
                    {
                      (index === 0
                        ? translate('receive.scope-shielded')
                        : translate('receive.scope-transparent')) as string
                    }
                  </BoldText>
                </View>
              )}
              <Pressable
                onPress={() => show('NA')}
                hitSlop={8}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 4,
                }}
              >
                <FontAwesomeIcon icon={faPlus} size={18} color={colors.zingo} />
              </Pressable>
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
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        handleComponent={renderModalHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
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
    </View>
  );

  //console.log('render Receive - 4', uAddr, uAddrIndex, tAddr, tAddrIndex, defaultUnifiedAddress);

  return returnPage;
};

export default Receive;
