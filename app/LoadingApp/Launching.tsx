/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView, Text, View, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../types';
import { ButtonTypeEnum, TranslateType } from '../AppState';
import Button from '../../components/Components/Button';

type LaunchingProps = {
  translate: (key: string) => TranslateType;
  firstLaunchingMessage: boolean;
  biometricsFailed: boolean;
  tryAgain?: () => void;
  message?: string;
};

const Launching: React.FunctionComponent<LaunchingProps> = props => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '95%',
        }}>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '80%',
            height: '40%',
            marginTop: 20,
            padding: 10,
          }}>
          <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
            {props.translate('zingo') as string}
          </Text>
          <Text style={{ color: colors.zingo, fontSize: 15 }}>{props.translate('version') as string}</Text>
        </View>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '80%',
            height: '60%',
            marginTop: 20,
            padding: 10,
          }}>
          {!!props.message && (
            <Text
              style={{
                color: colors.primaryDisabled,
                fontSize: 15,
                marginTop: 10,
              }}>
              {props.message}
            </Text>
          )}
          {props.biometricsFailed ? (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginTop: 10,
                  textAlign: 'center',
                }}>
                {props.translate('biometricsfailed-title') as string}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  marginTop: 10,
                  textAlign: 'center',
                }}>
                {props.translate('biometricsfailed-body') as string}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  marginTop: 10,
                  marginBottom: 10,
                  textAlign: 'center',
                }}>
                {props.translate('biometricsfailed-footer') as string}
              </Text>
              <Button
                type={ButtonTypeEnum.Primary}
                title={props.translate('biometricsfailed-button') as string}
                onPress={() => props.tryAgain && props.tryAgain()}
                style={{ marginBottom: 10, marginTop: 10 }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={props.firstLaunchingMessage ? colors.primary : 'transparent'} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginTop: 10,
                  opacity: props.firstLaunchingMessage && !props.biometricsFailed ? 1 : 0,
                  textAlign: 'center',
                }}>
                {props.translate('firstlaunchingmessage-title') as string}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  marginTop: 10,
                  opacity: props.firstLaunchingMessage && !props.biometricsFailed ? 1 : 0,
                  textAlign: 'center',
                }}>
                {props.translate('firstlaunchingmessage-body') as string}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  marginTop: 10,
                  marginBottom: 10,
                  opacity: props.firstLaunchingMessage && !props.biometricsFailed ? 1 : 0,
                  textAlign: 'center',
                }}>
                {props.translate('firstlaunchingmessage-footer') as string}
              </Text>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Launching;
