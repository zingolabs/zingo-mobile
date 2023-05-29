/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type AboutProps = {
  closeModal: () => void;
};
const About: React.FunctionComponent<AboutProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  return (
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
      />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 20,
        }}>
        {arrayTxt.map((txt: string) => (
          <FadeText style={{ marginBottom: 30 }} key={txt.substring(0, 10)}>
            {txt}
          </FadeText>
        ))}
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type="Secondary" title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default About;
