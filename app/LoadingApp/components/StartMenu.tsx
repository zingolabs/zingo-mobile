/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ActivityIndicator, ScrollView, Alert, NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@react-navigation/native';

import ContextMenu, { ContextMenuOnPressNativeEvent } from 'react-native-context-menu-view';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ButtonTypeEnum, ModeEnum, SelectServerEnum } from '../../AppState';
import Button from '../../../components/Components/Button';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  hasRecoveryWalletInfoSaved: boolean;
  recoverRecoveryWalletInfo: (b: boolean) => void;
  changeMode: (v: ModeEnum) => void;
  walletExists: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  openServers: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  hasRecoveryWalletInfoSaved,
  recoverRecoveryWalletInfo,
  changeMode,
  walletExists,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
  openServers,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, mode, translate, indexerServer, selectIndexerServer } = context;
  const { colors } = useTheme()  as ThemeType;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          backgroundColor: colors.card,
          padding: 10,
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 999,
        }}>
        {netInfo.isConnected && !actionButtonsDisabled && (
          <>
            {mode === ModeEnum.basic ? (
              <ContextMenu
                title={translate('loadedapp.options') as string}
                dropdownMenuMode={true}
                actions={
                  hasRecoveryWalletInfoSaved
                    ? [{ title: translate('loadingapp.recoverkeys') as string }, {title: translate('loadingapp.advancedmode') as string }]
                    : [{ title: translate('loadingapp.advancedmode') as string }]
                }
                onPress={(e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
                  if (hasRecoveryWalletInfoSaved && e.nativeEvent.index === 0) {
                    recoverRecoveryWalletInfo(true);
                  } else if (hasRecoveryWalletInfoSaved && e.nativeEvent.index === 1) {
                    changeMode(ModeEnum.advanced);
                  } else if (!hasRecoveryWalletInfoSaved && e.nativeEvent.index === 0) {
                    changeMode(ModeEnum.advanced);
                  }
                }}
              >
                <FontAwesomeIcon style={{ width: 40, padding: 10 }} icon={faEllipsisV} color={'#ffffff'} size={40} />
              </ContextMenu>
            ) : (
              <ContextMenu
                title={translate('loadedapp.options') as string}
                dropdownMenuMode={true}
                actions={
                  hasRecoveryWalletInfoSaved
                    ? [{ title: translate('loadingapp.recoverkeys') as string }, { title: translate('loadingapp.custom') as string }]
                    : [{ title: translate('loadingapp.custom') as string }]
                }
                onPress={(e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
                  if (hasRecoveryWalletInfoSaved && e.nativeEvent.index === 0) {
                    recoverRecoveryWalletInfo(true);
                  } else if (hasRecoveryWalletInfoSaved && e.nativeEvent.index === 1) {
                    openServers();
                  } else if (!hasRecoveryWalletInfoSaved && e.nativeEvent.index === 0) {
                    openServers();
                  }
                }}
              >
                <FontAwesomeIcon style={{ width: 40, padding: 10 }} icon={faEllipsisV} color={'#ffffff'} size={40} />
              </ContextMenu>
            )}
          </>
        )}
        {!netInfo.isConnected && hasRecoveryWalletInfoSaved && !actionButtonsDisabled && (
          <ContextMenu
            title={translate('loadedapp.options') as string}
            dropdownMenuMode={true}
            actions={[{ title: translate('loadingapp.recoverkeys') as string }]}
            onPress={(e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
              if (e.nativeEvent.index === 0) {
                recoverRecoveryWalletInfo(true);
              }
            }}
          >
            <FontAwesomeIcon style={{ width: 40, padding: 10 }} icon={faEllipsisV} color={'#ffffff'} size={40} />
          </ContextMenu>
        )}
      </View>
      <ScrollView
        style={{ maxHeight: '90%' }}
        keyboardShouldPersistTaps={'handled'}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 20,
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>

          {selectIndexerServer !== SelectServerEnum.offline && (
            <>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {`${translate('loadingapp.actualserver') as string} [${
                  translate(`settings.value-chainname-${indexerServer.chainName}`) as string
                }]`}
              </BoldText>
              <BoldText style={{ fontSize: 15, marginBottom: 10 }}>{indexerServer.uri}</BoldText>
            </>
          )}
          {selectIndexerServer === SelectServerEnum.offline && (
            <View style={{ flexDirection: 'row' }}>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {translate('loadingapp.actualserver') as string}
              </BoldText>
              <BoldText style={{ fontSize: 15, marginBottom: 3, color: 'red' }}>
                {' ' + (translate('settings.server-offline') as string)}
              </BoldText>
            </View>
          )}

          {(!netInfo.isConnected || netInfo.type === NetInfoStateType.cellular || netInfo.isConnectionExpensive) && (
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
                }}>
                <View style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
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
                }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 10,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderRadius: 5,
                    padding: 5,
                  }}>
                  <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
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

          {netInfo.isConnected && selectIndexerServer !== SelectServerEnum.offline && (
            <Button
              testID="loadingapp.createnewwallet"
              type={ButtonTypeEnum.Primary}
              title={translate('loadingapp.createnewwallet') as string}
              disabled={actionButtonsDisabled}
              onPress={() => {
                if (walletExists) {
                  Alert.alert(
                    translate('loadingapp.alert-newwallet-title') as string,
                    translate('loadingapp.alert-newwallet-body') as string,
                    [
                      {
                        text: translate('confirm') as string,
                        onPress: () => createNewWallet(),
                      },
                      { text: translate('cancel') as string, style: 'cancel' },
                    ],
                    { cancelable: false },
                  );
                } else {
                  createNewWallet();
                }
              }}
              style={{ marginBottom: 10, marginTop: 10 }}
            />
          )}

          {netInfo.isConnected && selectIndexerServer !== SelectServerEnum.offline && (
            <View style={{ marginTop: 10, display: 'flex', alignItems: 'center', width: '100%' }}>
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

          {(!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) && !walletExists && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginHorizontal: 20,
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 20,
                  borderColor: colors.primary,
                  borderWidth: 1,
                  borderRadius: 5,
                  padding: 5,
                }}>
                <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
                  {translate('loadingapp.nointernet-message') as string}
                </BoldText>
              </View>
            </View>
          )}

          {actionButtonsDisabled && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default StartMenu;
