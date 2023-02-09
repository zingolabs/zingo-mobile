/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { PieChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text } from 'react-native-svg';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Toast from 'react-native-simple-toast';
import Clipboard from '@react-native-community/clipboard';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../Components/FadeText';

type InfoProps = {
  closeModal: () => void;
};

const Labels = ({ slices }) => {
  return slices.map((slice, index) => {
    const { labelCentroid, pieCentroid, data } = slice;
    return (
      <G key={index}>
        <Line
          x1={labelCentroid[0]}
          y1={labelCentroid[1]}
          x2={pieCentroid[0]}
          y2={pieCentroid[1]}
          stroke={data.svg.fill}
        />
        <Circle cx={labelCentroid[0]} cy={labelCentroid[1]} r={15} fill={data.svg.fill} />
        <Text x={labelCentroid[0] - 10} y={labelCentroid[1] + 5}>
          {data.value.toFixed(2)}
        </Text>
      </G>
    );
  });
};

const data = [1.009, 0.0004, 10.009, 3, 1.909, 13.0987];
const uas = [
  'u1ecda0fsgq6efntnxglssrpjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffen98x3yt80crsut5yu4x5hltg90w5m0zyh2w5mfp3pk',
  'u2fsgq6efntnxglssrpjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffen98x3yt80crsut5yu4x5hltg90w5m0zyh2hklaijfliafhy',
  'u3sjalisjfdflaisojfdlaapjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffen98x3yt80crsut5jashnlsakvlskvlskdvslkdvsli',
  'u4asdlcikjaldsdfjalsdafpjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffen98x3ytiaujhfkaishdjdflaijflaisfjlaissflll',
  'u5kcjaoscjaosjcklaoskjlpjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffjahlisflaijflakfjlajieuilqapsjfhskdjhfdloma',
  'u6efanlaksdlakstnxglssrpjr7rktfhrkunhyaa99hp6724l20sndm83gpnmevcc8h7txxa2m7xt4e3qyyd34lwn62v7gse0dzn2a04m4hxsp2e2lk8mflw9r9kuv2cue6ldtvgvccnt9ge6fmdq9dveputxyyl53sfsd72ffen98x3yt80crsukfjfslidfjwioemcslkjdfiejfwio',
];
const tags = ['filomeno', 'free2z', 'Shileded Labs', 'codetoinspire', 'Safeway', 'Tag Coffee'];

// eslint-disable-next-line no-bitwise
const randomColor = () => ('#' + ((Math.random() * 0xffffff) << 0).toString(16) + '000000').slice(0, 7);

const pieData = data
  .filter(value => value > 0)
  .map((value, index) => ({
    value,
    svg: { fill: randomColor() },
    key: `pie-${index}`,
  }));

const Info: React.FunctionComponent<InfoProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { info, totalBalance, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('insight.title')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView style={{ maxHeight: '85%' }} contentContainerStyle={{}}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <PieChart style={{ height: 400 }} data={pieData} innerRadius={50} outerRadius={150} labelRadius={180}>
            <Labels slices={undefined} />
          </PieChart>
        </View>
        <View style={{ display: 'flex', width: '100%', margin: 20, alignItems: 'center' }}>
          <View>
            {pieData.map((item, index) => {
              return (
                <View key={`tag-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <FontAwesomeIcon style={{ margin: 5 }} size={20} icon={faQrcode} color={item.svg.fill} />
                  <FadeText style={{ marginHorizontal: 10 }}>{tags[index]}</FadeText>
                  <TouchableOpacity
                    onPress={() => {
                      if (uas[index]) {
                        Clipboard.setString(uas[index]);
                        Toast.show(translate('transactions.addresscopied'), Toast.LONG);
                      }
                    }}>
                    <View>
                      <RegText>{Utils.trimToSmall(uas[index], 10)}</RegText>
                    </View>
                  </TouchableOpacity>
                  <ZecAmount
                    currencyName={info.currencyName ? info.currencyName : ''}
                    size={15}
                    amtZec={item.value}
                    style={{ opacity: 0.5, marginHorizontal: 5 }}
                  />
                </View>
              );
            })}
          </View>
        </View>
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

export default Info;
