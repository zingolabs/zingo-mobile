/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Text, View, ActivityIndicator, ScrollView, Image, TouchableOpacity, TextInput, Alert, NativeSyntheticEvent, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import ContextMenu, { ContextMenuOnPressNativeEvent } from 'react-native-context-menu-view';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV, faWifi } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ButtonTypeEnum, ChainNameEnum, GlobalConst, ModeEnum, SelectServerEnum } from '../../AppState';
import Button from '../../../components/Components/Button';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import FadeText from '../../../components/Components/FadeText';
import ChainTypeToggle from '../../../components/Components/ChainTypeToggle';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  hasRecoveryWalletInfoSaved: boolean;
  recoverRecoveryWalletInfo: (b: boolean) => void;
  changeMode: (v: ModeEnum) => void;
  customServer: () => void;
  customServerShow: boolean;
  customServerOffline: boolean;
  onPressServerOffline: (v: boolean) => void;
  customServerChainName: string;
  onPressServerChainName: (v: ChainNameEnum) => void;
  customServerUri: string;
  setCustomServerUri: (v: string) => void;
  usingCustomServer: () => void;
  setCustomServerShow: (v: boolean) => void;
  walletExists: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  hasRecoveryWalletInfoSaved,
  recoverRecoveryWalletInfo,
  changeMode,
  customServer,
  customServerShow,
  customServerOffline,
  onPressServerOffline,
  customServerChainName,
  onPressServerChainName,
  customServerUri,
  setCustomServerUri,
  usingCustomServer,
  setCustomServerShow,
  walletExists,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, mode, translate, lightWalletserver, selectLightWalletServer } = context;
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
                    customServer();
                  } else if (!hasRecoveryWalletInfoSaved && e.nativeEvent.index === 0) {
                    customServer();
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
          <View style={{ marginBottom: 30, display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
              {translate('zingodelegator') as string}
            </Text>
            <Text style={{ color: colors.zingo, fontSize: 15 }}>{translate('version') as string}</Text>
            <Image
              source={require('../../../assets/img/logobig-zingo.png')}
              style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 10, borderRadius: 10 }}
            />
          </View>

          {selectLightWalletServer !== SelectServerEnum.offline && (
            <>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {`${translate('loadingapp.actualserver') as string} [${
                  translate(`settings.value-chainname-${lightWalletserver.chainName}`) as string
                }]`}
              </BoldText>
              <BoldText style={{ fontSize: 15, marginBottom: 10 }}>{lightWalletserver.uri}</BoldText>
            </>
          )}
          {selectLightWalletServer === SelectServerEnum.offline && (
            <View style={{ flexDirection: 'row' }}>
              <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                {translate('loadingapp.actualserver') as string}
              </BoldText>
              <BoldText style={{ fontSize: 15, marginBottom: 3, color: 'red' }}>
                {' ' + (translate('settings.server-offline') as string)}
              </BoldText>
            </View>
          )}

          {customServerShow && (
            <View
              style={{
                borderColor: colors.primaryDisabled,
                borderWidth: 1,
                paddingTop: 10,
                paddingLeft: 10,
                paddingRight: 10,
                marginBottom: 5,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {selectLightWalletServer !== SelectServerEnum.offline && (
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: 0,
                    marginBottom: 10,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderColor: customServerOffline ? colors.primary : colors.zingo,
                    borderWidth: customServerOffline ? 2 : 1,
                    borderRadius: 10,
                    minWidth: 25,
                    minHeight: 25,
                  }}>
                  <TouchableOpacity onPress={() => onPressServerOffline(!customServerOffline)}>
                    <View style={{ flexDirection: 'row', margin: 0, padding: 0 }}>
                      <FontAwesomeIcon icon={faWifi} color={customServerOffline ? 'red' : colors.zingo} size={18} />
                      <FadeText style={{ marginLeft: 10, marginRight: 5 }}>
                        {translate('settings.server-offline') as string}
                      </FadeText>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              {!customServerOffline && (
                <>
                  <ChainTypeToggle
                    customServerChainName={customServerChainName}
                    onPress={onPressServerChainName}
                    translate={translate}
                    disabled={actionButtonsDisabled}
                  />
                  <View
                    style={{
                      borderColor: colors.border,
                      borderWidth: 1,
                      marginBottom: 10,
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: '50%',
                      minHeight: 48,
                      alignItems: 'center',
                    }}>
                    <TextInput
                      placeholder={GlobalConst.serverPlaceHolder}
                      placeholderTextColor={colors.placeholder}
                      style={{
                        color: colors.text,
                        fontWeight: '600',
                        fontSize: 18,
                        minWidth: '90%',
                        minHeight: 48,
                        marginLeft: 5,
                        backgroundColor: 'transparent',
                      }}
                      value={customServerUri}
                      onChangeText={setCustomServerUri}
                      editable={!actionButtonsDisabled}
                      maxLength={100}
                    />
                  </View>
                </>
              )}
              <View style={{ flexDirection: 'row' }}>
                <Button
                  type={ButtonTypeEnum.Primary}
                  title={translate('save') as string}
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    usingCustomServer();
                    Keyboard.dismiss();
                  }}
                  style={{ marginBottom: 10 }}
                  twoButtons={true}
                />
                <Button
                  type={ButtonTypeEnum.Secondary}
                  title={translate('cancel') as string}
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    setCustomServerShow(false);
                    Keyboard.dismiss();
                  }}
                  style={{ marginBottom: 10, marginLeft: 10 }}
                  twoButtons={true}
                />
              </View>
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

          {netInfo.isConnected && selectLightWalletServer !== SelectServerEnum.offline && (
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

          {netInfo.isConnected && selectLightWalletServer !== SelectServerEnum.offline && (
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

          {(!netInfo.isConnected || selectLightWalletServer === SelectServerEnum.offline) && !walletExists && (
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
