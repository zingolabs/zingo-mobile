/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Text, View, ActivityIndicator, Image, Pressable } from 'react-native';
import { showConfirm } from '../../services/showConfirm';
import { useTheme } from '../../theme';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import ActionMenuBottomSheet, {
  ActionMenuBottomSheetAction,
} from '../../../ui/widgets/ActionMenuBottomSheet';

import { ButtonTypeEnum, ModeEnum, SelectServerEnum } from '../../AppState';
import Button from '../../../ui/primitives/Button';
import SheetRim from '../../../ui/primitives/SheetRim';
import { ContextAppLoading } from '../../context';
import {
  getZingoLogo,
  getZingoName,
  getZingoVersion,
} from '../../utils/ZingoAppData';
import BoldText from '../../../ui/primitives/BoldText';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  hasRecoveryWalletInfoSaved: boolean;
  recoverRecoveryWalletInfo: (b: boolean) => void;
  changeMode: (v: ModeEnum) => void;
  customServer: () => void;
  walletExists: boolean;
  hasBackupWallet: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  restoreLastBackup: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  hasRecoveryWalletInfoSaved,
  recoverRecoveryWalletInfo,
  changeMode,
  customServer,
  walletExists,
  hasBackupWallet,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
  restoreLastBackup,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, mode, translate, server, selectServer } = context;
  const { colors } = useTheme();

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const startMenuSheetRef = useRef<BottomSheet>(null);
  const optionsMenuRef = useRef<BottomSheetModal>(null);

  const startMenuSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  // Consolidates the three legacy ContextMenu kebabs into one action list
  // gated by network + mode + saved-state. Order: recoverkeys → primary
  // action (advanced vs custom server) → restore backup.
  const optionsActions = useMemo<ActionMenuBottomSheetAction[]>(() => {
    if (actionButtonsDisabled) {
      return [];
    }
    const list: ActionMenuBottomSheetAction[] = [];
    if (hasRecoveryWalletInfoSaved) {
      list.push({
        label: translate('loadingapp.recoverkeys') as string,
        onPress: () => recoverRecoveryWalletInfo(true),
      });
    }
    if (netInfo.isConnected) {
      if (mode === ModeEnum.basic) {
        list.push({
          label: translate('loadingapp.advancedmode') as string,
          onPress: () => changeMode(ModeEnum.advanced),
        });
      } else {
        list.push({
          label: translate('loadingapp.custom') as string,
          onPress: () => customServer(),
        });
        if (hasBackupWallet) {
          list.push({
            label: translate('loadedapp.restorebackupwallet') as string,
            onPress: () =>
              showConfirm({
                title: translate('loadedapp.restorebackupwallet') as string,
                message: translate(
                  'loadedapp.alert-restorebackupwallet-body',
                ) as string,
                buttons: [
                  {
                    text: translate('confirm') as string,
                    onPress: () => restoreLastBackup(),
                  },
                  { text: translate('cancel') as string, style: 'cancel' },
                ],
              }),
          });
        }
      }
    }
    return list;
  }, [
    actionButtonsDisabled,
    hasRecoveryWalletInfoSaved,
    netInfo.isConnected,
    mode,
    hasBackupWallet,
    translate,
    recoverRecoveryWalletInfo,
    changeMode,
    customServer,
    restoreLastBackup,
  ]);

  const renderStartMenuHandle = useCallback(
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
        {/* StartMenu-only quirk: the parent header section has no opaque
            background (unlike the standard <Header/> used elsewhere), and
            on Android the straight middle of the top border between the
            two corner arcs is dropped. Paint it explicitly between the
            corner radii. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 40,
            right: 40,
            height: 1,
            backgroundColor: colors.bottomSheetBorder,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
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
            {translate('loadingapp.welcome') as string}
          </BoldText>
        </View>
      </View>
    ),
    [colors, translate],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <View
          style={{
            backgroundColor: colors.bgCanvas,
            padding: 10,
            position: 'absolute',
            top: 0,
            right: 0,
          }}
        >
          {optionsActions.length > 0 && (
            <Pressable
              onPress={() => optionsMenuRef.current?.present()}
              style={{ width: 40, padding: 10 }}
              hitSlop={8}
            >
              <FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={32} />
            </Pressable>
          )}
        </View>
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
            paddingBottom: 20,
          }}
        >
          <Text
            style={{ color: colors.fgMuted, fontSize: 40, fontWeight: 'bold' }}
          >
            {getZingoName()}
          </Text>
          <Text style={{ color: colors.fgMuted, fontSize: 15 }}>
            {getZingoVersion()}
          </Text>
          <Image
            source={getZingoLogo()}
            style={{
              width: 100,
              height: 100,
              resizeMode: 'contain',
              marginTop: 10,
              borderRadius: 22,
            }}
          />
        </View>
      </View>
      <BottomSheet
        ref={startMenuSheetRef}
        snapPoints={startMenuSnapPoints}
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
        handleComponent={renderStartMenuHandle}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps={'handled'}
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingHorizontal: 20,
            paddingBottom: 30,
          }}
        >
          {selectServer !== SelectServerEnum.offline && (
            <>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {`${translate('loadingapp.actualserver') as string} [${
                  translate(
                    `settings.value-chainname-${server.chainName}`,
                  ) as string
                }]`}
              </BoldText>
              <BoldText style={{ fontSize: 15, marginBottom: 10 }}>
                {server.uri}
              </BoldText>
            </>
          )}
          {selectServer === SelectServerEnum.offline && (
            <>
              <View style={{ flexDirection: 'row' }}>
                <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                  {translate('loadingapp.actualserver') as string}
                </BoldText>
                <BoldText
                  style={{ fontSize: 15, marginBottom: 3, color: 'red' }}
                >
                  {' ' + (translate('settings.server-offline') as string)}
                </BoldText>
              </View>
              {/* Offline has no server URI, but the chain is still configured
                  (create/restore derive keys chain-specifically). Show the same
                  [Network] label the other modes display. */}
              <BoldText style={{ fontSize: 15, marginBottom: 10 }}>
                {`[${
                  translate(
                    `settings.value-chainname-${server.chainName}`,
                  ) as string
                }]`}
              </BoldText>
            </>
          )}

          {(!netInfo.isConnected ||
            netInfo.type === NetInfoStateType.cellular ||
            netInfo.isConnectionExpensive) && (
            <>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {translate('report.networkstatus') as string}
              </BoldText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  marginHorizontal: 20,
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: 10,
                  }}
                >
                  {!netInfo.isConnected && (
                    <BoldText style={{ fontSize: 15, color: 'red' }}>
                      {' '}
                      {translate('report.nointernet') as string}{' '}
                    </BoldText>
                  )}
                  {netInfo.type === NetInfoStateType.cellular && (
                    <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                      {' '}
                      {translate('report.cellulardata') as string}{' '}
                    </BoldText>
                  )}
                  {netInfo.isConnectionExpensive && (
                    <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                      {' '}
                      {translate('report.connectionexpensive') as string}{' '}
                    </BoldText>
                  )}
                </View>
              </View>
            </>
          )}

          {walletExists && (
            <>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  marginHorizontal: 20,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 10,
                    borderColor: colors.borderAccent,
                    borderWidth: 1,
                    borderRadius: 5,
                    padding: 5,
                  }}
                >
                  <BoldText
                    style={{ fontSize: 15, color: colors.fgAccentDisabled }}
                  >
                    {translate('loadingapp.noopenwallet-message') as string}
                  </BoldText>
                </View>
              </View>
              <Button
                type={ButtonTypeEnum.Primary}
                title={translate('loadingapp.opencurrentwallet') as string}
                disabled={actionButtonsDisabled}
                onPress={() => openCurrentWallet()}
                style={{ marginBottom: 20 }}
              />
            </>
          )}

          {/* Create works Offline too: the seed is generated locally and its
              birthday falls back to the chain's activation height (the wallet
              just won't sync until a server is chosen). Show it both online and
              in Offline mode. */}
          {((netInfo.isConnected &&
            selectServer !== SelectServerEnum.offline) ||
            selectServer === SelectServerEnum.offline) && (
            <Button
              testID="loadingapp.createnewwallet"
              type={ButtonTypeEnum.Primary}
              title={translate('loadingapp.createnewwallet') as string}
              disabled={actionButtonsDisabled}
              onPress={() => {
                if (walletExists) {
                  showConfirm({
                    title: translate(
                      'loadingapp.alert-newwallet-title',
                    ) as string,
                    message: translate(
                      'loadingapp.alert-newwallet-body',
                    ) as string,
                    buttons: [
                      {
                        text: translate('confirm') as string,
                        style: 'destructive',
                        onPress: () => createNewWallet(),
                      },
                      { text: translate('cancel') as string, style: 'cancel' },
                    ],
                  });
                } else {
                  createNewWallet();
                }
              }}
              style={{ marginBottom: 10, marginTop: 10 }}
            />
          )}

          {/* Restore works Offline: seed/UFVK derivation needs no Indexer
              (the wallet just won't sync until a server is chosen). Show it
              both online and in Offline mode. */}
          {((netInfo.isConnected &&
            selectServer !== SelectServerEnum.offline) ||
            selectServer === SelectServerEnum.offline) && (
            <View
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Button
                testID="loadingapp.restorewalletseedufvk"
                type={ButtonTypeEnum.Secondary}
                title={translate('loadingapp.restorewalletseedufvk') as string}
                disabled={actionButtonsDisabled}
                onPress={() => getwalletToRestore()}
                style={{ marginBottom: 10 }}
              />
            </View>
          )}

          {!netInfo.isConnected && !walletExists && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginHorizontal: 20,
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 20,
                  borderColor: colors.borderAccent,
                  borderWidth: 1,
                  borderRadius: 5,
                  padding: 5,
                }}
              >
                <BoldText
                  style={{ fontSize: 15, color: colors.fgAccentDisabled }}
                >
                  {translate('loadingapp.nointernet-message') as string}
                </BoldText>
              </View>
            </View>
          )}

          {selectServer === SelectServerEnum.offline && !walletExists && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginHorizontal: 20,
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 20,
                  borderColor: colors.borderAccent,
                  borderWidth: 1,
                  borderRadius: 5,
                  padding: 5,
                }}
              >
                <BoldText
                  style={{ fontSize: 15, color: colors.fgAccentDisabled }}
                >
                  {translate('loadingapp.offline-message') as string}
                </BoldText>
              </View>
            </View>
          )}

          {actionButtonsDisabled && (
            <ActivityIndicator
              size="large"
              color={colors.fgAccent}
              style={{ marginVertical: 20 }}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      <ActionMenuBottomSheet
        ref={optionsMenuRef}
        title={translate('loadedapp.options') as string}
        actions={optionsActions}
      />
    </View>
  );
};

export default StartMenu;
