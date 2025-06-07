/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dimensions, Keyboard, View } from 'react-native';
import { TabView, TabBar, SceneRendererProps, Route, NavigationState, TabBarItem } from 'react-native-tab-view';
import { useTheme } from '@react-navigation/native';

import SingleAddress from '../Components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import RegText from '../Components/RegText';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import {
  AddressKindEnum,
  ModeEnum,
  SecurityType,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressBookFileClass,
} from '../../app/AppState';
import { RPCAddressScopeEnum } from '../../app/rpc/enums/RPCAddressScopeEnum';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';

type ReceiveProps = {
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
  setSecurityOption,
  setAddressBook,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addresses, defaultUnifiedAddress, mode, language } = context;
  const { colors } = useTheme() as ThemeType;
  moment.locale(language);

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [tAddr, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [tAddrIndex, setTAddrIndex] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [indexBottomSheet, setIndexBottomSheet] = useState<number>(-1);

  const snapPoints = useMemo(() => [index === 0 ? '55%' : '40%', '65%', index === 0 ? '95%' : '80%'], [index]);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const newAddressShow = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
    setIndexBottomSheet(0);
  }, []);

  const newAddressHide = useCallback(() => {
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
    let component: any;
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
                  index={uAddrIndex ? uAddrIndex : 0}
                  total={uAddr.length}
                  prev={() => {
                    if (uAddrIndex !== null && uAddrIndex > 0) {
                      setUAddrIndex(uAddrIndex - 1);
                    }
                  }}
                  next={() => {
                    if (uAddrIndex !== null && uAddrIndex < uAddr.length - 1) {
                      setUAddrIndex(uAddrIndex + 1);
                    }
                  }}
                  setSecurityOption={setSecurityOption}
                  newAddressShow={newAddressShow}
                  changeIndex={(index: number) => {
                    setIndex(index);
                  }}
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
                  index={tAddrIndex ? tAddrIndex : 0}
                  total={tAddr.length}
                  prev={() => {
                    if (tAddrIndex !== null && tAddrIndex > 0) {
                      setTAddrIndex(tAddrIndex - 1);
                    }
                  }}
                  next={() => {
                    if (tAddrIndex !== null && tAddrIndex < tAddr.length - 1) {
                      setTAddrIndex(tAddrIndex + 1);
                    }
                  }}
                  setSecurityOption={setSecurityOption}
                  newAddressShow={newAddressShow}
                  changeIndex={(index: number) => {
                    setIndex(index);
                  }}
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

  const renderLabelCustom: ({ route, focused, color }: { route: any; focused: any; color: any }) => ReactNode = ({
    route,
    focused,
    color,
  }) => {
    const w = (dimensions.width - 50) / (mode === ModeEnum.basic ? 1 : 2);
    //const w = route.key === 'uaddr' ? '40%' : '30%';
    return (
      <View
        style={{
          width: w,
          alignItems: 'center',
          justifyContent: 'center',
          height: 50,
        }}>
        <RegText
          style={{
            fontWeight: mode === ModeEnum.basic ? 'normal' : focused ? 'bold' : 'normal',
            fontSize: mode === ModeEnum.basic ? 14 : focused ? 15 : 14,
            color: color,
          }}>
          {(route.title ? route.title : '') +
            (mode === ModeEnum.advanced &&
            ((route.key === 'uaddr' && uAddr.length > 1) || (route.key === 'taddr' && tAddr.length > 1))
              ? ` (${route.key === 'uaddr' ? uAddr.length : route.key === 'taddr' ? tAddr.length : ''})`
              : '')}
        </RegText>
        {route.key === 'uaddr' && mode === ModeEnum.basic && (
          <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. zingo)</RegText>
        )}
        {route.key === 'taddr' && mode === ModeEnum.basic && (
          <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. coinbase, gemini)</RegText>
        )}
      </View>
    );
  };

  const renderTabBarPage: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = props => {
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
              : mode === ModeEnum.basic
              ? (translate('receive.title-basic') as string)
              : (translate('receive.title-advanced') as string)
          }
          toggleMenuDrawer={toggleMenuDrawer}
          noBalance={true}
          noPrivacy={true}
        />
      </View>
    );
  };

  const returnPage = (
    <>
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
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        onChange={handleSheetChanges}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={{ display: 'none' }}>
        <BottomSheetView style={{ backgroundColor: colors.sideMenuBackground, width: '100%', height: '100%' }}>
          <NewAddress
            addressKind={index === 0 ? AddressKindEnum.u : AddressKindEnum.t}
            closeSheet={newAddressHide}
            setAddressBook={setAddressBook}
          />
        </BottomSheetView>
      </BottomSheet>
    </>
  );

  //console.log('render Receive - 4', uAddr, uAddrIndex, tAddr, tAddrIndex, defaultUnifiedAddress);

  return returnPage;
};

export default Receive;
