/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';

import FadeText from '../Components/FadeText';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import DetailLine from '../Components/DetailLine';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { useMagicModal } from 'react-native-magic-modal';

type AboutProps = {
};
const About: React.FunctionComponent<AboutProps> = () => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, language } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);
  const { hide } = useMagicModal();

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          height: '100%',
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('zingo') + ' ' + translate('version')}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={hide}
        />
        <ScrollView
          style={{ maxHeight: '90%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            padding: 20,
          }}>
          <FadeText>{arrayTxt[0]}</FadeText>
          <DetailLine label={translate('info.zingolib') as string} value={info.zingolib} />
          <View style={{ marginTop: 20 }}>
            {arrayTxt.map((txt: string, ind: number) => (
              <View key={txt.substring(0, 10)}>
                {ind !== 0 && <FadeText style={{ marginBottom: 20 }}>{txt}</FadeText>}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default About;
