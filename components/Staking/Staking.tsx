/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, TouchableOpacity, Pressable } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faHome, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import RegText from '../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeText from '../Components/FadeText';

type StakingProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Staking>;

const Staking: React.FunctionComponent<StakingProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const insets = useSafeAreaInsets();

  const goHome = () => {
    navigation.navigate(RouteEnum.History);
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

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Staking</RegText>

        </View>
      </ScrollView>
      <View 
        style={{
          position: 'absolute',
          bottom: 30,
          flexDirection: 'row',
          alignSelf: 'center',
          gap: 10,
      }}>
        <Pressable
          onPress={goHome}
          disabled={false}
          style={({ pressed }) => ({
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 25,
            paddingVertical: 10,
            backgroundColor: colors.secondary,
            borderRadius: 50,
            transform: [{ scale: pressed ? 0.9 : 1 }],
            borderWidth: 1,
            borderColor: colors.zingo,
          })}>
          <FontAwesomeIcon
            style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
            size={20}
            icon={faHome}
            color={colors.zingo}
          />
          <FadeText style={{ color: colors.zingo, fontSize: 12, opacity: 1 }}>Home</FadeText>
        </Pressable>
        <Pressable
          onPress={() => {}}
          disabled={true}
          style={({ pressed }) => ({
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 25,
            paddingVertical: 10,
            backgroundColor: colors.secondary,
            borderRadius: 50,
            transform: [{ scale: pressed ? 0.9 : 1 }],
            borderWidth: 1,
            borderColor: colors.zingo,
          })}>
          <FontAwesomeIcon
            style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
            size={20}
            icon={faLayerGroup}
            color={colors.primary}
          />
          <FadeText style={{ color: colors.primary, fontSize: 12, opacity: 1 }}>Staking</FadeText>
        </Pressable>
      </View>
    </ToastProvider>
  );
};

export default Staking;
