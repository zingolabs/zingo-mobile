/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ActivityIndicator, ScrollView, TextInput, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ButtonTypeEnum, ChainNameEnum, GlobalConst, ModeEnum, ScreenEnum } from '../../AppState';
import Button from '../../../components/Components/Button';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';

type ServersProps = {
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

const Servers: React.FunctionComponent<ServersProps> = ({
  actionButtonsDisabled,
  customServerUri,
  setCustomServerUri,
  usingCustomServer,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ height: '90%', maxHeight: '90%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>

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

            {actionButtonsDisabled && (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            )}
          </View>
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
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            disabled={actionButtonsDisabled}
            onPress={() => {
              clear();
              usingCustomServer();
              Keyboard.dismiss();
            }}
            style={{ marginBottom: 10 }}
            twoButtons={false}
          />
        </View>
      </View>
    </ToastProvider>
  );
};

export default Servers;
