/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ButtonTypeEnum, ScreenEnum, SelectServerEnum } from '../../AppState';
import Button from '../../../components/Components/Button';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  openServers: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  walletExists,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
  openServers,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, indexerServer, selectIndexerServer, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.StartMenu;

  const insets = useSafeAreaInsets();
  
  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ 
          flex: 1, 
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >

        <View style={{
          position: 'absolute',
          width: 75,
          top: 10,
          left: 10,
          zIndex: 999,
        }}>
          <View
            style={{
              borderRadius: 25,
              borderColor: colors.text,
              borderWidth: 1,
              padding: 10,
              margin: 10,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity onPress={() => {
                clear();
                openServers();
              }}>
                <FontAwesomeIcon
                  size={30}
                  icon={faChevronLeft}
                  color={colors.text}
                />
              </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
        }}>
          <View
            style={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
          }}>

            <RegText color={colors.text} style={{ fontSize: 30 }}>Welcome to</RegText>
            <RegText color={colors.text} style={{ fontSize: 30 }}>your wallet</RegText>

            {(!netInfo.isConnected || netInfo.type === NetInfoStateType.cellular || netInfo.isConnectionExpensive) && false && (
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

            {(!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) && !walletExists && false && (
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

          </View>
        </ScrollView>
        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
          }}>

            <FadeText style={{ fontSize: 15, marginBottom: 10 }}>
              {`Connected to: ${indexerServer.uri}`}
            </FadeText>

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

            <Button
              testID="loadingapp.restorewalletseedufvk"
              type={ButtonTypeEnum.Secondary}
              title={translate('loadingapp.restorewalletseedufvk') as string}
              disabled={actionButtonsDisabled}
              onPress={() => getwalletToRestore()}
              style={{ marginBottom: 10 }}
            />

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

        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default StartMenu;
