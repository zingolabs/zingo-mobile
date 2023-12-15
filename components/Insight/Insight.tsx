/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { PieChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text } from 'react-native-svg';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
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
import AddressItem from '../Components/AddressItem';

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
          const percent = (100 * data.value) / totalValue;

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
              <Text x={labelCentroid[0] - (percent === 100 ? 15 : 10)} y={labelCentroid[1] + 5}>
                {getPercent(percent)}
              </Text>
            </G>
          );
        })}
    </>
  );
};

const getPercent = (percent: number) => {
  return (percent < 1 ? '<1' : percent < 100 && percent >= 99 ? '99' : percent.toFixed(0)) + '%';
};

type InsightProps = {
  closeModal: () => void;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
};

const Insight: React.FunctionComponent<InsightProps> = ({ closeModal, set_privacy_option }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, privacy, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'sent' | 'sends' | 'memobytes'>('sent');
  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultStr: string = '';
      switch (tab) {
        case 'sent':
          resultStr = await RPCModule.execute('value_to_address', '');
          //console.log('################# value', resultStr);
          break;
        case 'sends':
          resultStr = await RPCModule.execute('sends_to_address', '');
          //console.log('################# sends', resultStr);
          break;
        case 'memobytes':
          resultStr = await RPCModule.execute('memobytes_to_address', '');
          //console.log('################# memobytes', resultStr);
          break;
        default:
          break;
      }
      const resultJSON = await JSON.parse(resultStr);
      let amounts: { value: number; address: string; tag: string }[] = [];
      const resultJSONEntries: [string, number][] = Object.entries(resultJSON) as [string, number][];
      resultJSONEntries.forEach(([key, value]) => {
        if (!(tab !== 'sent' && key === 'fee')) {
          // excluding the fee for `sends` and `memobytes`.
          if (value > 0) {
            amounts.push({ value: tab === 'sent' ? value / 10 ** 8 : value, address: key, tag: '' });
          }
        }
      });
      const randomColors = Utils.generateColorList(amounts.length);
      const newPieAmounts: DataType[] = amounts
        .sort((a, b) => b.value - a.value)
        .map((item, index) => {
          return {
            value: item.value,
            address: item.address,
            tag: item.tag,
            svg: { fill: item.address === 'fee' ? colors.zingo : randomColors[index] },
            key: `pie-${index}`,
          };
        });
      setPieAmounts(newPieAmounts);
      const newExpandAddress = Array(newPieAmounts.length).fill(false);
      setExpandAddress(newExpandAddress);
      setLoading(false);
    })();
  }, [colors.zingo, tab]);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const line = (item: DataType, index: number) => {
    const totalValue = pieAmounts ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0) : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines = item.address.length < 40 ? 2 : item.address.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={{ width: '100%' }} key={`tag-${index}`}>
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 5,
            borderBottomColor: '#333333',
            borderBottomWidth: item.address !== 'fee' ? 1 : 0,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {(!expandAddress[index] || item.address === 'fee') && (
              <FontAwesomeIcon style={{ margin: 5 }} size={20} icon={faQrcode} color={item.svg.fill} />
            )}
            {!!item.tag && <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>}
            <TouchableOpacity
              onPress={() => {
                if (item.address !== 'fee') {
                  Clipboard.setString(item.address);
                  addLastSnackbar({
                    message: translate('history.addresscopied') as string,
                    type: 'Primary',
                    duration: 'short',
                  });
                  selectExpandAddress(index);
                }
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'wrap',
                }}>
                {item.address !== 'fee' && (
                  <AddressItem address={item.address} oneLine={true} onlyContact={true} withIcon={true} />
                )}
                {!expandAddress[index] && !!item.address && (
                  <RegText>
                    {item.address.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(item.address, dimensions.width < 500 ? 5 : 10)
                      : item.address}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.address &&
                  Utils.splitStringIntoChunks(item.address, Number(numLines.toFixed(0))).map(
                    (c: string, idx: number) => (
                      <RegText color={item.svg.fill} key={idx}>
                        {c}
                      </RegText>
                    ),
                  )}
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: expandAddress[index] && item.address !== 'fee' ? 'column-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <RegText>{getPercent(percent)}</RegText>
            {tab === 'sent' ? (
              <ZecAmount
                currencyName={info.currencyName ? info.currencyName : ''}
                size={15}
                amtZec={item.value}
                style={{ marginHorizontal: 5 }}
                privacy={privacy}
              />
            ) : (
              <RegText style={{ marginLeft: 10 }}>
                {'# ' +
                  item.value.toString() +
                  (tab === 'sends' ? translate('insight.sends-unit') : translate('insight.memobytes-unit'))}
              </RegText>
            )}
          </View>
        </View>
      </View>
    );
  };

  //console.log('render insight');

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
        title={translate('insight.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        set_privacy_option={set_privacy_option}
        addLastSnackbar={addLastSnackbar}
      />

      <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
        <TouchableOpacity onPress={() => setTab('sent')}>
          <View
            style={{
              width: (dimensions.width - 20) / 3,
              alignItems: 'center',
              borderBottomColor: colors.primary,
              borderBottomWidth: tab === 'sent' ? 2 : 0,
              paddingBottom: 10,
            }}>
            <RegText
              style={{
                fontWeight: tab === 'sent' ? 'bold' : 'normal',
                fontSize: tab === 'sent' ? 15 : 14,
                color: colors.text,
              }}>
              {translate('insight.sent') as string}
            </RegText>
            <RegText style={{ fontSize: 11, color: tab === 'sent' ? colors.primary : colors.text }}>
              ({translate('insight.sent-text') as string})
            </RegText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('sends')}>
          <View
            style={{
              width: (dimensions.width - 20) / 3,
              alignItems: 'center',
              borderBottomColor: colors.primary,
              borderBottomWidth: tab === 'sends' ? 2 : 0,
              paddingBottom: 10,
            }}>
            <RegText
              style={{
                fontWeight: tab === 'sends' ? 'bold' : 'normal',
                fontSize: tab === 'sends' ? 15 : 14,
                color: colors.text,
              }}>
              {translate('insight.sends') as string}
            </RegText>
            <RegText style={{ fontSize: 11, color: tab === 'sends' ? colors.primary : colors.text }}>
              ({translate('insight.sends-text') as string})
            </RegText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('memobytes')}>
          <View
            style={{
              width: (dimensions.width - 20) / 3,
              alignItems: 'center',
              borderBottomColor: colors.primary,
              borderBottomWidth: tab === 'memobytes' ? 2 : 0,
              paddingBottom: 10,
            }}>
            <RegText
              style={{
                fontWeight: tab === 'memobytes' ? 'bold' : 'normal',
                fontSize: tab === 'memobytes' ? 15 : 14,
                color: colors.text,
              }}>
              {translate('insight.memobytes') as string}
            </RegText>
            <RegText style={{ fontSize: 11, color: tab === 'memobytes' ? colors.primary : colors.text }}>
              ({translate('insight.memobytes-text') as string})
            </RegText>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle={'white'}
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{}}>
        <View style={{ display: 'flex', margin: 20 }}>
          {!loading && (!pieAmounts || !pieAmounts.length) && (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 100 }}>
              <RegText>{translate('insight.no-data') as string}</RegText>
            </View>
          )}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
          ) : (
            <PieChart
              style={{ height: dimensions.width * 0.7 }}
              data={pieAmounts}
              innerRadius={dimensions.width * 0.09}
              outerRadius={dimensions.width * 0.23}
              labelRadius={dimensions.width * 0.23 + 30}>
              <Labels />
            </PieChart>
          )}
        </View>
        <View style={{ display: 'flex', marginHorizontal: 5, padding: 0, alignItems: 'center' }}>
          <View style={{ width: '100%' }}>
            {!loading && !!pieAmounts && !!pieAmounts.length && (
              <>
                {pieAmounts
                  .filter(item => item.address === 'fee')
                  .map((item, index) => {
                    return line(item, index);
                  })}
                <View style={{ height: 1, backgroundColor: colors.primary }} />
                {pieAmounts
                  .filter(item => item.address !== 'fee')
                  .map((item, index) => {
                    return line(item, index);
                  })}
              </>
            )}
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
