/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView, Text, View, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../types';
import { TranslateType } from '../AppState';

type LaunchingProps = {
  translate: (key: string) => TranslateType;
  firstLaunchingMessage: boolean;
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
        <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
          {props.translate('zingo') as string}
        </Text>
        <Text style={{ color: colors.zingo, fontSize: 15 }}>{props.translate('version') as string}</Text>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80%',
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
          {props.firstLaunchingMessage && <ActivityIndicator size="large" color={colors.primary} />}
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: 'bold',
              marginTop: 10,
              opacity: props.firstLaunchingMessage ? 1 : 0,
            }}>
            {props.translate('firstlaunchingmessage-title') as string}
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              marginTop: 10,
              opacity: props.firstLaunchingMessage ? 1 : 0,
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
              opacity: props.firstLaunchingMessage ? 1 : 0,
            }}>
            {props.translate('firstlaunchingmessage-footer') as string}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Launching;
