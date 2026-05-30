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
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import RegText from '../Components/RegText';
import BoldText from '../Components/BoldText';
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
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
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
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ShowUfvk;

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [sheetType, setSheetType] = useState<'EA' | null>(null);
  const [action, setAction] = useState<UfvkActionEnum>(
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : UfvkActionEnum.view,
  );
  const [fetchedWallet, setFetchedWallet] = useState<WalletType>(
    {} as WalletType,
  );
  const [loadingUfvk, setLoadingUfvk] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const ufvkSheetRef = useRef<BottomSheet>(null);

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
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const show = useCallback((_sheetType: 'EA') => {
    setSheetType(_sheetType);
    bottomSheetRef.current?.present();
  }, []);

  const hide = useCallback(() => {
    setSheetType(null);
    bottomSheetRef.current?.dismiss();
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

  const ufvkSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const ufvkTitle = useMemo(
    () => translate('ufvk.viewkey') + ' (' + translate(`seed.${action}`) + ')',
    [action, translate],
  );

  const renderUfvkHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
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
          <TouchableOpacity
            onPress={onClickCancelHide}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
            {ufvkTitle}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, ufvkTitle],
  );

  const renderUfvkFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            type={
              mode === ModeEnum.basic
                ? ButtonTypeEnum.Secondary
                : ButtonTypeEnum.Primary
            }
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
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, mode, texts, action, times, fetchedWallet.ufvk, translate],
  );

  return (
    <View>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      >
        <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
          <Header
            title={''}
            screenName={screenName}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noUfvkIcon={true}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
          />
        </View>
        <BottomSheet
          ref={ufvkSheetRef}
          snapPoints={ufvkSnapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderUfvkHandle}
          footerComponent={loadingUfvk ? undefined : renderUfvkFooter}
        >
          {loadingUfvk ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginVertical: 20 }}
            />
          ) : (
            <>
              <BottomSheetScrollView
                bounces={false}
                alwaysBounceVertical={false}
                style={{
                  flex: 1,
                  backgroundColor: colors.bottomSheetBackground,
                }}
                contentContainerStyle={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  paddingBottom: 80,
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
              </BottomSheetScrollView>
            </>
          )}
        </BottomSheet>
      </View>
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        handleStyle={{ display: 'none' }}
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
            paddingBottom: 30,
          }}
        >
          {sheetType === 'EA' && (
            <ExpandedAddress
              onCopy={doCopy}
              closeSheet={hide}
              title={translate('receive.title-address') as string}
              button={translate('receive.copy-address-button') as string}
              address={fetchedWallet.ufvk ? fetchedWallet.ufvk : ''}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default ShowUfvk;
