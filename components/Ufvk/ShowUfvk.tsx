/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import RegText from '../Components/RegText';
import { ButtonTypeEnum, ChainNameEnum, ModeEnum, RouteEnum, ScreenEnum, SnackbarDurationEnum, UfvkActionEnum } from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import ExpandedAddress from '../Receive/components/ExpandedAddress';
import { DrawerScreenProps } from '@react-navigation/drawer';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type ShowUfvkProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Ufvk> & {
  onClickOK: () => void;
  onClickCancel: () => void;
};
const ShowUfvk: React.FunctionComponent<ShowUfvkProps> = ({
  navigation,
  route,
  onClickOK, 
  onClickCancel 
}) => {
  const context = useContext(ContextAppLoaded);
  const { 
    translate, 
    wallet, 
    lightWalletserver, 
    mode, 
    addLastSnackbar, 
    snackbars, 
    removeFirstSnackbar, 
    setPrivacyOption,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.ShowUfvk;

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [sheetType, setSheetType] = useState<'EA' | null>(null);
  const [action, setAction] = useState<UfvkActionEnum>(!!route.params && route.params.action !== undefined ? route.params.action : UfvkActionEnum.view);
  const [heightLayout, setHeightLayout] = useState<number>(10);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => {
    let snap1: number = (heightLayout * 100) / Dimensions.get('window').height;
    if (snap1 < 1) {
      snap1 = 1;
    }
    let snap2: number = 80;
    if (snap1 < 80) {
      snap2 = snap1 + 20;
    }
    return [
      `${snap1}%`,
      `${snap2}%`,
    ]
  }, [heightLayout]);

  const show = useCallback((_sheetType: 'EA') => {
    setSheetType(_sheetType);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);
  
  const hide = useCallback(() => {
    setSheetType(null);
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
  }, []);

  useEffect(() => {
    const _action = !!route.params && route.params.action !== undefined ? route.params.action : UfvkActionEnum.view;
    setAction(_action);
  }, [
    route, 
    route.params, 
    route.params?.action
  ]);
    
  useEffect(() => {
    const buttonTextsArray = translate('ufvk.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(
      action === UfvkActionEnum.change || action === UfvkActionEnum.backup || action === UfvkActionEnum.server ? 1 : 0,
    );
  }, [action, translate]);

  const onPressOK = () => {
    Alert.alert(
      !!texts && !!texts[action] ? texts[action][3] : '',
      (action === UfvkActionEnum.change
        ? (translate('ufvk.change-warning') as string)
        : action === UfvkActionEnum.backup
        ? (translate('ufvk.backup-warning') as string)
        : action === UfvkActionEnum.server
        ? (translate('ufvk.server-warning') as string)
        : '') +
        (lightWalletserver.chainName !== ChainNameEnum.mainChainName &&
        (action === UfvkActionEnum.change || action === UfvkActionEnum.server)
          ? '\n' + (translate('ufvk.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => onClickOKHide(),
        },
        { text: translate('cancel') as string, onPress: () => onClickCancelHide(), style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const onClickCancelHide = () => {
    onClickCancel();
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const onClickOKHide = () => {
    onClickOK();
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
  );

  const doCopy = () => {
    Clipboard.setString(wallet.ufvk ? wallet.ufvk : '');
    addLastSnackbar({
      message: (translate('seed.tapcopy-ufvk-message') as string),
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };
  
  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('ufvk.viewkey') + ' (' + translate(`seed.${action}`) + ')'}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={onClickCancelHide}
        />
        <ScrollView
          style={{ height: '80%', maxHeight: '80%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          <RegText style={{ marginTop: 0, padding: 20, textAlign: 'center', fontWeight: '900' }}>
            {action === UfvkActionEnum.backup || action === UfvkActionEnum.change || action === UfvkActionEnum.server
              ? (translate(`ufvk.text-readonly-${action}`) as string)
              : (translate('ufvk.text-readonly') as string)}
          </RegText>

          <View style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center' }}>
            {!!wallet.ufvk && (
              <SingleAddress
                ufvk={wallet.ufvk}
                screenName={screenName}
                index={0}
                setIndex={() => {}}
                total={1}
                show={() => show('EA')}
              />
            )}
            {!wallet.ufvk && <ActivityIndicator size="large" color={colors.primary} />}
          </View>

          <View style={{ marginBottom: 30 }} />
        </ScrollView>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <Button
            type={mode === ModeEnum.basic ? ButtonTypeEnum.Secondary : ButtonTypeEnum.Primary}
            style={{
              backgroundColor: mode === ModeEnum.basic ? colors.background : colors.primary,
            }}
            title={
              mode === ModeEnum.basic
                ? (translate('cancel') as string)
                : !!texts && !!texts[action]
                ? texts[action][times]
                : ''
            }
            onPress={() => {
              if (!wallet.ufvk) {
                return;
              }
              if (times === 0) {
                onClickOKHide();
              } else if (times === 1) {
                onPressOK();
              }
            }}
          />
        </View>
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={{ display: 'none' }}
        backdropComponent={renderBackdrop}>
        <BottomSheetView style={{ backgroundColor: colors.background, height: '100%' }}>
          {sheetType === 'EA' && (
            <ExpandedAddress
              onCopy={doCopy}
              closeSheet={hide}
              title={translate('receive.title-address') as string}
              button={translate('receive.copy-address-button') as string}
              address={wallet.ufvk ? wallet.ufvk : ''}
              setHeightLayout={setHeightLayout}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </ToastProvider>
  );
};

export default ShowUfvk;
