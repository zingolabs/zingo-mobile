/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from '../Components/FadeText';
import ZecAmount from '../Components/ZecAmount';
import RegText from '../Components/RegText';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import ZingoLogoImage from '../ZingoLogoImage';
import Header from '../Header';

type AboutProps = {
  closeModal: () => void;
};
const About: React.FunctionComponent<AboutProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  const arrayTxtObject: string = translate('about.copyright');
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
      <Header>
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('zingo') + ' ' + translate('version')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </Header>

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
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default About;
