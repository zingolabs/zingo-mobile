/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';
import { createAlert } from '../../../app/createAlert';
import { sendEmail } from '../../../app/sendEmail';

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
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
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
            alignItems: 'flex-start',
            justifyContent: 'center',
        }}>

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Debug Info</RegText>

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
