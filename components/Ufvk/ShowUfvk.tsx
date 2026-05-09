/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import Button from '../Components/Button';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import RegText from '../Components/RegText';
import {
  ButtonTypeEnum,
  ChainNameEnum,
  ModeEnum,
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  UfvkActionEnum,
} from '../../app/AppState';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import ExpandedAddress from '../Receive/components/ExpandedAddress';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { getRecoveryWalletInfo } from '../../app/recoveryWalletInfov10';
import WalletType from '../../app/AppState/types/WalletType';
import { fetchWallet } from '../../app/walletBackend';

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
  onClickCancel,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    server,
    mode,
    addLastSnackbar,
    setPrivacyOption,
    recoveryWalletInfoOnDevice,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.ShowUfvk;

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [sheetType, setSheetType] = useState<'EA' | null>(null);
  const [action, setAction] = useState<UfvkActionEnum>(
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : UfvkActionEnum.view,
  );
  const [heightLayout, setHeightLayout] = useState<number>(10);
  const [fetchedWallet, setFetchedWallet] = useState<WalletType>(
    {} as WalletType,
  );
  const [loadingUfvk, setLoadingUfvk] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoadingUfvk(true);
      if (recoveryWalletInfoOnDevice) {
        const info = await getRecoveryWalletInfo();
        setFetchedWallet(info);
      } else {
        const info = await fetchWallet(true);
        setFetchedWallet(info ?? ({} as WalletType));
      }
      setLoadingUfvk(false);
    })();
  }, [recoveryWalletInfoOnDevice]);

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    return [`${snap1}%`, `${snap2}%`];
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
    const _action =
      !!route.params && route.params.action !== undefined
        ? route.params.action
        : UfvkActionEnum.view;
    setAction(_action);
  }, [route, route.params, route.params?.action]);

  useEffect(() => {
    const buttonTextsArray = translate('ufvk.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(
      action === UfvkActionEnum.change ||
        action === UfvkActionEnum.backup ||
        action === UfvkActionEnum.server
        ? 1
        : 0,
    );
  }, [action, translate]);

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) {
        clearTimeout(clipboardTimer.current);
      }
      Clipboard.setString('');
    };
  }, []);

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
        (server.chainName !== ChainNameEnum.mainChainName &&
        (action === UfvkActionEnum.change || action === UfvkActionEnum.server)
          ? '\n' + (translate('ufvk.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => onClickOKHide(),
        },
        {
          text: translate('cancel') as string,
          onPress: () => onClickCancelHide(),
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  };

  const onClickCancelHide = () => {
    onClickCancel();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const onClickOKHide = () => {
    onClickOK();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const doCopy = () => {
    if (!fetchedWallet.ufvk) {
      return;
    }
    if (clipboardTimer.current) {
      clearTimeout(clipboardTimer.current);
    }
    Clipboard.setString(fetchedWallet.ufvk);
    addLastSnackbar(
      translate('seed.tapcopy-ufvk-message') as string,
      SnackbarDurationEnum.longer,
    );
    clipboardTimer.current = setTimeout(() => {
      Clipboard.setString('');
      clipboardTimer.current = null;
      addLastSnackbar(
        translate('seed.clipboard-cleared') as string,
        SnackbarDurationEnum.long,
      );
    }, 60 * 1000);
  };

  return (
    <View>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <Header
          title={
            translate('ufvk.viewkey') + ' (' + translate(`seed.${action}`) + ')'
          }
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={onClickCancelHide}
        />
        {loadingUfvk ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginVertical: 20 }}
          />
        ) : (
          <>
            <ScrollView
              style={{ height: '80%', maxHeight: '80%' }}
              contentContainerStyle={{
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}
            >
              <RegText
                style={{
                  marginTop: 0,
                  padding: 20,
                  textAlign: 'center',
                  fontWeight: '900',
                }}
              >
                {action === UfvkActionEnum.backup ||
                action === UfvkActionEnum.change ||
                action === UfvkActionEnum.server
                  ? (translate(`ufvk.text-readonly-${action}`) as string)
                  : (translate('ufvk.text-readonly') as string)}
              </RegText>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 0,
                  alignItems: 'center',
                }}
              >
                {!!fetchedWallet.ufvk && (
                  <>
                    <SingleAddress
                      ufvk={fetchedWallet.ufvk}
                      index={0}
                      setIndex={() => {}}
                      total={1}
                      show={() => show('EA')}
                    />
                    <TouchableOpacity onPress={doCopy}>
                      <Text
                        style={{
                          color: colors.text,
                          textDecorationLine: 'underline',
                          padding: 10,
                          textAlign: 'center',
                          minHeight: 48,
                        }}
                      >
                        {translate('seed.tapcopy') as string}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
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
              }}
            >
              <Button
                type={
                  mode === ModeEnum.basic
                    ? ButtonTypeEnum.Secondary
                    : ButtonTypeEnum.Primary
                }
                style={{
                  backgroundColor:
                    mode === ModeEnum.basic
                      ? colors.background
                      : colors.primary,
                }}
                title={
                  mode === ModeEnum.basic
                    ? (translate('cancel') as string)
                    : !!texts && !!texts[action]
                      ? texts[action][times]
                      : ''
                }
                onPress={() => {
                  if (!fetchedWallet.ufvk) {
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
          </>
        )}
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={{ display: 'none' }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{ backgroundColor: colors.background, height: '100%' }}
        >
          {sheetType === 'EA' && (
            <ExpandedAddress
              onCopy={doCopy}
              closeSheet={hide}
              title={translate('receive.title-address') as string}
              button={translate('receive.copy-address-button') as string}
              address={fetchedWallet.ufvk ? fetchedWallet.ufvk : ''}
              setHeightLayout={setHeightLayout}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default ShowUfvk;
