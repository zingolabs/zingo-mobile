/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';
import { createAlert } from '../../../app/createAlert';
import { sendEmail } from '../../../app/sendEmail';
import { HeaderTitle } from '../../Header';

type DebugInfoProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.DebugInfo>;

const DebugInfo: React.FunctionComponent<DebugInfoProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { 
    snackbars, 
    removeFirstSnackbar, 
    lastError, 
    setBackgroundError, 
    addLastSnackbar, 
    translate, 
    zingolibVersion 
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.DebugInfo;

  const insets = useSafeAreaInsets();

  const reportError = (error: string) => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      [screenName],
      'Last Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
  };
  
  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle title='Debug info' goBack={() => {
        clear();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
      }}>
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
        }}>
          <View style={{ borderRadius: 26, backgroundColor: colors.secondary, width: '100%', marginTop: 20, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginHorizontal: 30, width: '85%' }}>
              <FadeText>
                {lastError ? lastError : 'No errors detected'}
              </FadeText>
            </View>
          </View>
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
          {!!lastError && (
            <Button
              type={ButtonTypeEnum.Primary}
              title={'Report'}
              onPress={() => {
                reportError(lastError);
              }}
              twoButtons={false}
            />
          )}

      </View>
    </ToastProvider>
  );
};

export default DebugInfo;
