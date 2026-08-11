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
  Keyboard,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { showConfirm } from '../../app/showConfirm';

import { useTheme } from '../../app/theme';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

import Button from '../../ui/primitives/Button';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { useBiometricGate } from '../../app/hooks/useBiometricGate';
import Header from '../../ui/widgets/Header';
import SingleAddress from '../../ui/widgets/SingleAddress';
import RegText from '../../ui/primitives/RegText';
import FadeText from '../../ui/primitives/FadeText';
import BoldText from '../../ui/primitives/BoldText';
import SheetRim from '../../ui/primitives/SheetRim';
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
import { useDismissSheetsOnBlur } from '../../app/hooks/useDismissSheetsOnBlur';
import ExpandedAddress from '../Receive/components/ExpandedAddress';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getRecoveryWalletInfo,
  saveRecoveryWalletInfo,
} from '../../app/recoveryWalletInfo';
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

type ShowUfvkProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Ufvk
> & {
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
    security,
    foregroundEpoch,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.ShowUfvk;

  // Audit Issue D — single source of truth for the seed/UFVK biometric
  // gate. Lives inside ShowUfvk.tsx so every navigation path is funnelled
  // through the same check.
  //
  // The "change" and "backup" actions render the UFVK AND perform their
  // respective destructive operation. Each respects BOTH the per-action
  // toggle (changeWalletScreen / restoreWalletBackupScreen) and the
  // generic seedUfvkScreen toggle — if the user has asked for bio in
  // either of the two contexts, the gate fires.
  const initialAction: UfvkActionEnum =
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : UfvkActionEnum.view;
  const needsAuth: boolean =
    (initialAction === UfvkActionEnum.view && !!security?.seedUfvkScreen) ||
    (initialAction === UfvkActionEnum.change &&
      (!!security?.seedUfvkScreen || !!security?.changeWalletScreen)) ||
    (initialAction === UfvkActionEnum.backup &&
      (!!security?.seedUfvkScreen || !!security?.restoreWalletBackupScreen)) ||
    (initialAction === UfvkActionEnum.server && !!security?.seedUfvkScreen);
  const authPassed = useBiometricGate({
    needsAuth,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!security?.foregroundApp,
    foregroundEpoch,
  });

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
  // Tracks where the UFVK actually came from so the loading legend can
  // change mid-flight (keychain → wallet on fallback) and the post-load
  // line under "tap to copy" can show its origin to the user.
  const [ufvkSource, setUfvkSource] = useState<'keychain' | 'wallet' | null>(
    null,
  );
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const ufvkSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    // Wait for the on-mount biometric gate to pass before touching the
    // keychain — otherwise both prompts fire in parallel.
    if (!authPassed) {
      return;
    }
    (async () => {
      setLoadingUfvk(true);
      // Same logic as Seed.tsx: try the keychain first when the user
      // enabled the on-device recovery cache, but fall back to fetching
      // the UFVK directly from the wallet when the keychain returns
      // empty (user-cancel of the keychain bio prompt or read error).
      // ufvkSource is updated as we go so the loading legend reflects
      // what's actually being read at each moment.
      let info: WalletType = {} as WalletType;
      if (recoveryWalletInfoOnDevice) {
        setUfvkSource('keychain');
        info = await getRecoveryWalletInfo();
      }
      if (!info.ufvk) {
        setUfvkSource('wallet');
        const walletInfo = await fetchWallet(true);
        if (walletInfo) {
          info = walletInfo;
          // Self-heal: user opted into the on-device cache but the
          // keychain entry is missing. Write it now while the gate's
          // recent bio auth window is still warm so subsequent visits
          // hit the keychain. Fire-and-forget.
          if (recoveryWalletInfoOnDevice) {
            saveRecoveryWalletInfo(walletInfo).catch(e =>
              console.log('Self-heal save failed', e),
            );
          }
        }
      }
      setFetchedWallet(info);
      setLoadingUfvk(false);
    })();
  }, [recoveryWalletInfoOnDevice, authPassed]);

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  useDismissSheetsOnBlur();

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
      // Only wipe the clipboard if WE have a pending auto-clear timer —
      // i.e. the user copied something from this screen and the 60s
      // expiry hasn't fired yet. Otherwise we'd be wiping clipboard
      // content the user copied from somewhere else.
      if (clipboardTimer.current) {
        clearTimeout(clipboardTimer.current);
        Clipboard.setString('');
        clipboardTimer.current = null;
      }
    };
  }, []);

  const onPressOK = () => {
    showConfirm({
      title: !!texts && !!texts[action] ? texts[action][3] : '',
      message:
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
      buttons: [
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
    });
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
    // Capture into a local so the `string | undefined` narrowing from the
    // guard below survives into the showConfirm callback closure.
    const ufvk = fetchedWallet.ufvk;
    if (!ufvk) {
      return;
    }
    // Audit Suggestion 5 — explicit user consent before exposing the
    // viewing key to the system clipboard. The 60-second auto-clear is
    // kept as defense-in-depth.
    showConfirm({
      title: translate('seed.clipboard-confirm-title') as string,
      message: translate(
        Platform.OS === 'ios'
          ? 'seed.clipboard-confirm-message-ios'
          : 'seed.clipboard-confirm-message-android',
      ) as string,
      buttons: [
        {
          text: translate('copy') as string,
          onPress: () => {
            if (clipboardTimer.current) {
              clearTimeout(clipboardTimer.current);
            }
            Clipboard.setString(ufvk);
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
          },
        },
        {
          text: translate('cancel') as string,
          style: 'cancel',
        },
      ],
    });
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
          <TouchableOpacity
            onPress={onClickCancelHide}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.fgAccent}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
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
            backgroundColor: colors.bgSurface,
            paddingTop: 10,
            paddingBottom: 24,
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
            // Same rationale as Seed.tsx: in advanced mode the button
            // drives the ufvk-dependent confirm/change/backup/server
            // flow; disable when the UFVK is missing so presses don't
            // silently no-op.
            disabled={mode !== ModeEnum.basic && !fetchedWallet.ufvk}
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

  if (!authPassed) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
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
          keyboardBehavior={'interactive'}
          keyboardBlurBehavior={'restore'}
          android_keyboardInputMode={'adjustResize'}
          backgroundStyle={{
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          // Rendering the handle as sheet CONTENT (via `handleComponent={null}`
          // plus an inline call to `renderUfvkHandle` below) is what lets its
          // `borderTopRadius: 40` actually clip against the sheet's
          // `backgroundStyle`. When passed via `handleComponent`, gorhom wraps
          // the handle in an internal container that does not honour the
          // inner View's border-radius, so the corners render square. Same
          // pattern as `components/Receive/Receive.tsx`.
          handleComponent={null}
          footerComponent={loadingUfvk ? undefined : renderUfvkFooter}
        >
          {renderUfvkHandle()}
          {loadingUfvk ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 20,
              }}
            >
              <ActivityIndicator size="large" color={colors.fgAccent} />
              {ufvkSource !== null && mode !== ModeEnum.basic && (
                <RegText style={{ marginTop: 12, textAlign: 'center' }}>
                  {
                    translate(
                      ufvkSource === 'keychain'
                        ? 'ufvk.recovering-from-keychain'
                        : 'ufvk.recovering-from-wallet',
                    ) as string
                  }
                </RegText>
              )}
            </View>
          ) : (
            <>
              <BottomSheetScrollView
                bounces={false}
                alwaysBounceVertical={false}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgSurface,
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
                      <TouchableOpacity
                        onPress={doCopy}
                        style={{ marginTop: -80 }}
                      >
                        <Text
                          style={{
                            color: colors.fgDefault,
                            textDecorationLine: 'underline',
                            padding: 10,
                            textAlign: 'center',
                            minHeight: 48,
                          }}
                        >
                          {translate('seed.tapcopy') as string}
                        </Text>
                      </TouchableOpacity>
                      {ufvkSource !== null && mode !== ModeEnum.basic && (
                        <FadeText
                          style={{
                            alignSelf: 'stretch',
                            textAlign: 'right',
                            fontSize: 11,
                            paddingHorizontal: 10,
                            marginTop: -12,
                            marginRight: 20,
                          }}
                        >
                          {
                            translate(
                              ufvkSource === 'keychain'
                                ? 'ufvk.from-keychain'
                                : 'ufvk.from-wallet',
                            ) as string
                          }
                        </FadeText>
                      )}
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
        handleStyle={{ display: 'none' }}
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
