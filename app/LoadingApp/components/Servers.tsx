/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, ScrollView, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ButtonTypeEnum, GlobalConst, ScreenEnum } from '../../AppState';
import Button from '../../../components/Components/Button';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';

type ServersProps = {
  actionButtonsDisabled: boolean;
  setIndexerServerUri: (v: string) => Promise<void>;
  checkIndexerServer: () => Promise<boolean | null>;
  closeServers: () => void;
};

const Servers: React.FunctionComponent<ServersProps> = ({
  actionButtonsDisabled,
  setIndexerServerUri,
  checkIndexerServer,
  closeServers,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, snackbars, removeFirstSnackbar, indexerServer } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

  const [connected, setConnected] = useState<boolean | null>(null);
  const [kbOpen, setKbOpen] = React.useState(false);

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);


  const insets = useSafeAreaInsets();

  const maxW = 520; //tablets -> landscape.

  console.log('Render Servers', insets);

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : kbOpen ? 50 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}>
          <View
            style={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>

            <RegText color={colors.text} style={{ fontSize: 25 }}>Indexer Server</RegText>

            <FadeText style={{ marginBottom: 20, marginTop: 5 }}>texto</FadeText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 25,
                marginBottom: 10,
                backgroundColor: colors.secondary,
                width: '100%',
                maxWidth: maxW,
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 7,
              }}>
              <TextInput
                placeholder={GlobalConst.serverPlaceHolder}
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 18,
                  minHeight: 48,
                  marginLeft: 5,
                  backgroundColor: 'transparent',
                }}
                value={indexerServer.uri}
                onChangeText={(text) => {
                  setConnected(null);
                  setIndexerServerUri(text);
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              {!!indexerServer.uri && (
                <TouchableOpacity disabled={actionButtonsDisabled} onPress={() => setIndexerServerUri('')}>
                  <View 
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                      padding: 0,
                  }}>
                      <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={{
                marginTop: 20,
                padding: 0,
                paddingLeft: 20,
                paddingRight: 20,
                borderRadius: 25,
                borderWidth: 1,
                backgroundColor: actionButtonsDisabled ? '#767680' : connected === null ? '#2C2C2E' : connected ? '#0E9634' : '#610102',
              }}
              disabled={actionButtonsDisabled}
              onPress={async () => {
                const _connected = await checkIndexerServer();
                setConnected(_connected);
                Keyboard.dismiss();
            }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  marginBottom: 4,
                  minWidth: 48,
                  minHeight: 48,
                }}>
                {actionButtonsDisabled && (
                  <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 20 }} />
                )}
                <RegText>
                  {actionButtonsDisabled ? 'Testing...' : connected === null ? 'Test Connection' : connected ? 'Connected' : 'Error'}
                </RegText>
              </View>
            </TouchableOpacity>

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
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('continue') as string}
            disabled={actionButtonsDisabled}
            onPress={() => {
              clear();
              closeServers();
              Keyboard.dismiss();
            }}
            style={{ 
              marginBottom: 4,
              maxWidth: maxW,
            }}
            twoButtons={false}
          />
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Servers;
