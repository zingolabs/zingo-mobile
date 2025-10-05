/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode, useEffect, useRef, useMemo, useCallback } from 'react';
import { Keyboard, View } from 'react-native';
import { TabView, SceneRendererProps, Route, NavigationState } from 'react-native-tab-view';
import { useTheme } from '@react-navigation/native';

import Clipboard from '@react-native-clipboard/clipboard';
import SingleAddress from '../Components/SingleAddress';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';

import {
  AddressKindEnum,
  ModeEnum,
  SecurityType,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressBookFileClass,
  ScreenEnum,
  SnackbarDurationEnum,
  RouteEnum,
} from '../../app/AppState';
import { RPCAddressScopeEnum } from '../../app/rpc/enums/RPCAddressScopeEnum';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';
import VerifyAddress from './components/VerifyAddress';
import { ToastProvider } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import NewAddressTag from './components/NewAddressTag';
import TransparentWarning from './components/TransparentWarning';
import ExpandedAddress from './components/ExpandedAddress';
import { DrawerScreenProps } from '@react-navigation/drawer';

type ReceiveProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Receive> & {
  toggleMenuDrawer: () => void;
  alone: boolean;
  setSecurityOption: (s: SecurityType) => Promise<void>;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  // side menu
  toggleMenuDrawer,
  // balance
  // privacy
  // shielding
  // for receive
  alone,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { 
    translate, 
    addresses, 
    defaultUnifiedAddress, 
    mode, 
    language, 
    snackbars, 
    removeFirstSnackbar, 
    addLastSnackbar,
  } = context;
  const { colors } = useTheme() as ThemeType;
  moment.locale(language);
  const screenName = ScreenEnum.Receive;

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);
  const [sheetType, setSheetType] = useState<'NA' | 'VA' | 'NAT' | 'TW' | 'EA' | null>(null);

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [tAddr, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [tAddrIndex, setTAddrIndex] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [indexBottomSheet, setIndexBottomSheet] = useState<number>(-1);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const NASnapPoints = useMemo(() =>
    [
      index === 0 ? '55%' : '40%',
      '65%',
      index === 0 ? '95%' : '80%',
    ], [index]);

  const VASnapPoints = useMemo(() =>
    [
      '40%',
      '65%',
    ], []);

  const TWSnapPoints = useMemo(() =>
    [
      '40%',
    ], []);

  const NAShow = useCallback(() => {
    setSheetType('NA');
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const NAHide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
  }, []);

  const NATShow = useCallback(() => {
    setSheetType('NAT');
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const NATHide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
  }, []);

  const VAShow = useCallback(() => {
    setSheetType('VA');
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const VAHide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
  }, []);

  const TWShow = useCallback(() => {
    setSheetType('TW');
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const TWHide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
  }, []);

  const EAShow = useCallback(() => {
    setSheetType('EA');
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const EAHide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
  }, []);

  const handleSheetChanges = useCallback((ind: number) => {
    //console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& handleSheetChanges', ind);
    setIndexBottomSheet(ind);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (indexBottomSheet > -1) {
        bottomSheetRef.current?.snapToIndex(1);
        setIndexBottomSheet(1);
      }
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (indexBottomSheet > -1) {
        bottomSheetRef.current?.snapToIndex(0);
        setIndexBottomSheet(0);
      }
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [indexBottomSheet]);

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      // we offering now two types:
      // 1. UA
      // 2. T
      const uAdd =
        addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.addressKind === AddressKindEnum.u) ||
        [];
      // we are filtering only the `external` addresses... for now.
      const tAdd =
        addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.addressKind === AddressKindEnum.t && a.scope === RPCAddressScopeEnum.external,
        ) || [];
      setUAddr(uAdd as UnifiedAddressClass[]);
      setTAddr(tAdd as TransparentAddressClass[]);
      setUAddrIndex(uAdd.length > 0 ? uAdd.length - 1 : 0);
      setTAddrIndex(tAdd.length > 0 ? tAdd.length - 1 : 0);
    }
  }, [addresses]);

  useEffect(() => {
    const basicModeRoutes = [{ key: 'uaddr', title: translate('receive.u-title') as string }];
    const advancedModeRoutes = [
      { key: 'uaddr', title: translate('receive.u-title') as string },
      { key: 'taddr', title: translate('receive.t-title') as string },
    ];
    setRoutes(mode === ModeEnum.basic ? basicModeRoutes : advancedModeRoutes);
  }, [mode, translate]);

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    let component: React.ReactNode;
    switch (route.key) {
      case 'uaddr': {
        let uAddress = new UnifiedAddressClass(
          0,
          translate('receive.noaddress') as string,
          AddressKindEnum.u,
          false,
          false,
          false,
        );
        if (uAddrIndex !== null && uAddr.length > 0) {
          uAddress = uAddr[uAddrIndex];
        }

        component = (
          <>
            {!!addresses && !!defaultUnifiedAddress && (
              <>
                <SingleAddress
                  address={uAddress}
                  screenName={screenName}
                  index={uAddrIndex ? uAddrIndex : 0}
                  setIndex={setUAddrIndex}
                  total={uAddr.length}
                  NAShow={NAShow}
                  NATShow={NATShow}
                  VAShow={VAShow}
                  TWShow={TWShow}
                  EAShow={EAShow}
                  changeIndex={setIndex}
                  hasTransparent={tAddr && tAddr.length > 0}
                  showMoreOptions={showMoreOptions}
                  setShowMoreOptions={setShowMoreOptions}
                />
              </>
            )}
          </>
        );
        break;
      }
      case 'taddr': {
        let tAddress = new TransparentAddressClass(
          0,
          translate('receive.noaddress') as string,
          AddressKindEnum.t,
          RPCAddressScopeEnum.external,
        );
        if (tAddrIndex !== null && tAddr.length > 0) {
          tAddress = tAddr[tAddrIndex];
        }

        component = (
          <>
            {!!addresses && !!defaultUnifiedAddress && (
              <>
                <SingleAddress
                  address={tAddress}
                  screenName={screenName}
                  index={tAddrIndex ? tAddrIndex : 0}
                  setIndex={setTAddrIndex}
                  total={tAddr.length}
                  NAShow={NAShow}
                  NATShow={NATShow}
                  VAShow={VAShow}
                  EAShow={EAShow}
                  changeIndex={setIndex}
                />
              </>
            )}
          </>
        );
        break;
      }
    }
    return <>{component}</>;
  };

  const renderTabBarPage: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = () => {
    return (
      <View
        accessible={true}
        accessibilityLabel={translate('receive.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}>
        <Header
          title={
            alone
              ? (translate('receive.title-basic-alone') as string)
              : (translate('receive.title-address') as string)
          }
          screenName={screenName}
          toggleMenuDrawer={toggleMenuDrawer}
          noBalance={true}
          noPrivacy={true}
        />
      </View>
    );
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
  );

  const doCopy = () => {
    Clipboard.setString(index === 0 && uAddrIndex !== null
      ? uAddr[uAddrIndex].address
      : index === 1 && tAddrIndex !== null
      ? tAddr[tAddrIndex].address
      : '');
    addLastSnackbar({
      message: (translate('history.addresscopied') as string),
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };


  const returnPage = (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBarPage}
        onIndexChange={setIndex}
        swipeEnabled={false}
      />
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={sheetType === 'TW' ? TWSnapPoints : sheetType === 'NA' ? NASnapPoints : VASnapPoints}
        enableDynamicSizing={false}
        onChange={handleSheetChanges}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={{ display: 'none' }}
        backdropComponent={renderBackdrop}>
        <BottomSheetView style={{ backgroundColor: colors.background, height: '100%' }}>
          {sheetType === 'NA' && (
            <NewAddress
              addressKind={index === 0 ? AddressKindEnum.u : AddressKindEnum.t}
              closeSheet={NAHide}
              setAddressBook={setAddressBook}
              screenName={screenName}
            />
          )}
          {sheetType === 'NAT' && (
            <NewAddressTag
              address={index === 0 && uAddrIndex !== null
                ? uAddr[uAddrIndex].address
                : index === 1 && tAddrIndex !== null
                ? tAddr[tAddrIndex].address
                : ''}
              closeSheet={NATHide}
              setAddressBook={setAddressBook}
            />
          )}
          {sheetType === 'VA' && (
            <VerifyAddress
              closeSheet={VAHide}
              screenName={screenName}
            />
          )}
          {sheetType === 'TW' && (
            <TransparentWarning
              closeSheet={TWHide}
              onSuccess={
                () => {
                  setShowMoreOptions(false);
                  setIndex(1);
                }
              }
            />
          )}
          {sheetType === 'EA' && (
            <ExpandedAddress
                onCopy={doCopy}
                closeSheet={EAHide}
                title={translate('receive.title-address') as string}
                button={translate('receive.copy-address-button') as string}
                address={index === 0 && uAddrIndex !== null
                  ? uAddr[uAddrIndex].address
                  : index === 1 && tAddrIndex !== null
                  ? tAddr[tAddrIndex].address
                  : ''}
              />
          )}
        </BottomSheetView>
      </BottomSheet>
    </ToastProvider>
  );

  //console.log('render Receive - 4', uAddr, uAddrIndex, tAddr, tAddrIndex, defaultUnifiedAddress);

  return returnPage;
};

export default Receive;
