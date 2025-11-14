/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
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
  setIndexerServerUri: (v: string) => void;
  usingIndexerServer: () => void;
};

const Servers: React.FunctionComponent<ServersProps> = ({
  actionButtonsDisabled,
  setIndexerServerUri,
  usingIndexerServer,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, snackbars, removeFirstSnackbar, indexerServer } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

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
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 70}
      >
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
                onChangeText={setIndexerServerUri}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
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
                <TouchableOpacity onPress={() => setIndexerServerUri('')}>
                  <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                </TouchableOpacity>
              </View>
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
              usingIndexerServer();
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
