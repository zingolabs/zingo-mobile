/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';
import { PieChart, pieDataItem } from 'react-native-gifted-charts';
import { Text as SvgText } from 'react-native-svg';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../Components/FadeText';
import Header from '../Header';
import RPCModule from '../../app/RPCModule';
import AddressItem from '../Components/AddressItem';
import { CommandEnum, SnackbarDurationEnum } from '../../app/AppState';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { useMagicModal } from 'react-native-magic-modal';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  address: string;
  tag: string;
} & pieDataItem;

const getPercent = (percent: number) => {
  return (percent < 1 ? '<1' : percent < 100 && percent >= 99 ? '99' : percent.toFixed(0)) + '%';
};

type InsightProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
};

const Insight: React.FunctionComponent<InsightProps> = ({ setPrivacyOption }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, privacy, addLastSnackbar, language } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  moment.locale(language);

  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'sent' | 'sends' | 'memobytes'>('sent');
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultStr: string = '';
      switch (tab) {
        case 'sent':
          resultStr = await RPCModule.execute(CommandEnum.valueToAddress, '');
          //console.log('################# value', resultStr);
          break;
        case 'sends':
          resultStr = await RPCModule.execute(CommandEnum.sendsToAddress, '');
          //console.log('################# sends', resultStr);
          break;
        case 'memobytes':
          resultStr = await RPCModule.execute(CommandEnum.memobytesToAddress, '');
          //console.log('################# memobytes', resultStr);
          break;
        default:
          break;
      }
      let resultJSON: any;
      try {
        resultJSON = await JSON.parse(resultStr);
      } catch (e) {
        resultJSON = {};
      }
      let amounts: { value: number; address: string; tag: string }[] = [];
      const resultJSONEntries: [string, number][] = Object.entries(resultJSON) as [string, number][];
      resultJSONEntries &&
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
            color: item.address === 'fee' ? colors.zingo : randomColors[index],
            labelLineConfig: {
              color: item.address === 'fee' ? colors.zingo : randomColors[index],
            },
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
              <FontAwesomeIcon style={{ margin: 5 }} size={45} icon={faQrcode} color={item.svg.fill} />
            )}
            {!!item.tag && <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>}
            <TouchableOpacity
              onPress={() => {
                if (item.address !== 'fee') {
                  Clipboard.setString(item.address);
                  addLastSnackbar({
                    message: translate('history.addresscopied') as string,
                    duration: SnackbarDurationEnum.short,
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
                  <AddressItem
                    address={item.address}
                    oneLine={true}
                    onlyContact={true}
                    withIcon={true}
                    closeModal={() => {}}
                  />
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
                currencyName={info.currencyName}
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

  const renderExternalLabel = useCallback(
    (item: pieDataItem | undefined) => (
      <SvgText fontSize={18} fill={item?.color}>
        {item?.value}
      </SvgText>
    ),
    []
  );

  //console.log('render insight');

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
          title={translate('insight.title') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={hide}
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
          style={{ maxHeight: '90%' }}
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
              <View style={{ width: '100%', alignItems: 'center', paddingVertical: 20 }}>
                <PieChart
                  showExternalLabels
                  labelLineConfig={{
                    thickness: 2,
                    avoidOverlappingOfLabels: true,
                  }}
                  strokeWidth={4}
                  donut
                  innerCircleColor={colors.background}
                  innerCircleBorderWidth={4}
                  innerCircleBorderColor={colors.background}
                  strokeColor={colors.background}
                  showValuesAsTooltipText={true}
                  showText
                  externalLabelComponent={renderExternalLabel}
                  textSize={18}
                  textBackgroundColor={colors.background}
                  data={pieAmounts}
                  innerRadius={dimensions.width * 0.09}
                />
              </View>
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Insight;
