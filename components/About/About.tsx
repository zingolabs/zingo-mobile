/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import FadeText from '../Components/FadeText';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import DetailLine from '../Components/DetailLine';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';

type AboutProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.About>;

const About: React.FunctionComponent<AboutProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { zingolibVersion, translate, snackbars, removeFirstSnackbar } =
    context;
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const insets = useSafeAreaInsets();

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="About"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <FadeText style={{ marginTop: 20 }}>{arrayTxt[0]}</FadeText>
          <DetailLine
            label={'Zingo Delegator Version'}
            value={translate('version') as string}
            screenName={screenName}
          />
          <DetailLine
            label={translate('info.zingolib') as string}
            value={zingolibVersion}
            screenName={screenName}
          />
          <View style={{ marginTop: 20 }}>
            {arrayTxt.map((txt: string, ind: number) => (
              <View key={txt.substring(0, 10)}>
                {ind !== 0 && (
                  <FadeText style={{ marginBottom: 20 }}>{txt}</FadeText>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

export default About;
