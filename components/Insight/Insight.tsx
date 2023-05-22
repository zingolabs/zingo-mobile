/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { PieChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text } from 'react-native-svg';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Toast from 'react-native-simple-toast';
import Clipboard from '@react-native-community/clipboard';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../Components/FadeText';
import Header from '../Header';
import RPCModule from '../../app/RPCModule';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  address: string;
  tag: string;
};

type sliceType = {
  labelCentroid: number[];
  pieCentroid: number[];
  data: DataType;
};

type LabelProps = {
  slices?: sliceType[];
};

const Labels: React.FunctionComponent<LabelProps> = props => {
  const { slices } = props;
  const totalValue = slices ? slices.reduce((acc, curr) => acc + curr.data.value, 0) : 0;

  return (
    <>
      {!!slices &&
        slices.map((slice: sliceType, index: number) => {
          const { labelCentroid, pieCentroid, data } = slice;
          const percent = ((100 * data.value) / totalValue).toFixed(0);

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
                {(Number(percent) === 0 ? '<1%' : percent) + '%'}
              </Text>
            </G>
          );
        })}
    </>
  );
};

type InsightProps = {
  closeModal: () => void;
};

const Insight: React.FunctionComponent<InsightProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);

  // eslint-disable-next-line no-bitwise
  const randomColor = () => ('#' + ((Math.random() * 0xfffff) << 0).toString(16) + '000').slice(0, 7); // lighter colors

  useEffect(() => {
    (async () => {
      const resultStr = await RPCModule.execute('value_to_address', '');
      console.log('#################', resultStr);
      const resultJSON = await JSON.parse(resultStr);
      let amounts: { value: number; address: string; tag: string }[] = [];
      const resultJSONEntries: [string, number][] = Object.entries(resultJSON) as [string, number][];
      resultJSONEntries.forEach(([key, value]) => {
        if (value > 0) {
          amounts.push({ value: value / 10 ** 8, address: key, tag: '' });
        }
      });
      const newPieAmounts: DataType[] = amounts
        .sort((a, b) => b.value - a.value)
        .map((item, index) => {
          return {
            value: item.value,
            address: item.address,
            tag: item.tag,
            svg: { fill: randomColor() },
            key: `pie-${index}`,
          };
        });
      setPieAmounts(newPieAmounts);
      const newExpandAddress = Array(newPieAmounts.length).fill(false);
      setExpandAddress(newExpandAddress);
    })();
  }, []);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const line = (item: DataType, index: number) => {
    const totalValue = pieAmounts ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0) : 0;
    const percent = ((100 * item.value) / totalValue).toFixed(0);
    // 30 characters per line
    const numLines = item.address.length < 40 ? 2 : item.address.length / 30;
    return (
      <View key={`tag-${index}`}>
        {expandAddress[index] && <View style={{ height: 1, backgroundColor: colors.primaryDisabled }} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          {(!expandAddress[index] || item.address === 'fee') && (
            <FontAwesomeIcon style={{ margin: 5 }} size={20} icon={faQrcode} color={item.svg.fill} />
          )}
          <FadeText style={{ marginHorizontal: 10 }}>{item.tag}</FadeText>
          <TouchableOpacity
            onPress={() => {
              if (item.address) {
                Clipboard.setString(item.address);
                Toast.show(translate('history.addresscopied') as string, Toast.LONG);
                if (item.address !== 'fee') {
                  selectExpandAddress(index);
                }
              }
            }}>
            <View style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
              {!expandAddress[index] && !!item.address && (
                <RegText>{item.address.length > 20 ? Utils.trimToSmall(item.address, 10) : item.address}</RegText>
              )}
              {expandAddress[index] &&
                !!item.address &&
                Utils.splitStringIntoChunks(item.address, Number(numLines.toFixed(0))).map((c: string, idx: number) => (
                  <RegText key={idx}>{c}</RegText>
                ))}
            </View>
          </TouchableOpacity>
          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            size={15}
            amtZec={item.value}
            style={{ opacity: 0.5, marginHorizontal: 5 }}
          />
          <RegText>{(Number(percent) === 0 ? '<1' : percent) + '%'}</RegText>
          {expandAddress[index] && item.address !== 'fee' && (
            <FontAwesomeIcon style={{ margin: 5 }} size={20} icon={faQrcode} color={item.svg.fill} />
          )}
        </View>
        {expandAddress[index] && <View style={{ height: 1, backgroundColor: colors.primaryDisabled }} />}
      </View>
    );
  };

  console.log('render insight');

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header title={translate('insight.title') as string} noBalance={true} noSyncingStatus={true} noDrawMenu={true} />

      <ScrollView style={{ maxHeight: '85%' }} contentContainerStyle={{}}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <PieChart style={{ height: 400 }} data={pieAmounts} innerRadius={50} outerRadius={150} labelRadius={180}>
            <Labels />
          </PieChart>
        </View>
        <View style={{ display: 'flex', width: '100%', margin: 20, alignItems: 'center' }}>
          <View>
            {pieAmounts
              .filter(item => item.address === 'fee')
              .map((item, index) => {
                return line(item, index);
              })}
            <View style={{ height: 2, backgroundColor: colors.primary }} />
            {pieAmounts
              .filter(item => item.address !== 'fee')
              .map((item, index) => {
                return line(item, index);
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
        <Button type="Secondary" title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Insight;
