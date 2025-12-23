/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { PieChart, pieDataItem } from 'react-native-gifted-charts';
import { Text as SvgText } from 'react-native-svg';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../Components/FadeText';
import { HeaderTitle } from '../Header';
//import RPCModule from '../../app/RPCModule';
import AddressItem from '../Components/AddressItem';
import { RouteEnum, ScreenEnum, SnackbarDurationEnum } from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';

type DataType = {
  svg: {
    fill: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
} & pieDataItem;

const getPercent = (percent: number) => {
  return (percent < 1 ? '<1' : percent < 100 && percent >= 99 ? '99' : percent.toFixed(0)) + '%';
};

type DistributionProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Distribution>;

const Distribution: React.FunctionComponent<DistributionProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { 
    info, 
    translate, 
    privacy, 
    addLastSnackbar, 
    snackbars, 
    removeFirstSnackbar, 
  } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Insight;

  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'my' | 'network'>('my');
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultStr: string = '';
      switch (tab) {
        case 'my':
          //resultStr = await RPCModule.getTotalValueToAddressInfo();
          resultStr = JSON.stringify([
            {pub_key: '01234567890123456789012345678901', voting_power: 2000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 3000000},
          ]);
          //console.log('################# value', resultStr);
          break;
        case 'network':
          //resultStr = await RPCModule.getTotalSpendsToAddressInfo();
          resultStr = JSON.stringify([
            {pub_key: '01234567890123456789012345678901', voting_power: 1000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 2000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 3000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 4000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 5000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 6000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 7000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 8000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 9000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 10000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 11000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 12000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 13000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 14000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 15000000},
            {pub_key: '01234567890123456789012345678901', voting_power: 16000000},
          ]);
          //console.log('################# sends', resultStr);
          break;
        default:
          break;
      }
      let resultJSON: { pub_key: string, voting_power: number }[];
      try {
        resultJSON = await JSON.parse(resultStr);
      } catch (e) {
        resultJSON = [];
      }
      console.log(resultStr, resultJSON);
      const randomColors = Utils.generateColorList(resultJSON.length + 10);
      const newPieAmounts: DataType[] = resultJSON
        .filter((i: { pub_key: string, voting_power: number }) => i.voting_power > 0 && !!i.pub_key)
        .sort((a, b) => b.voting_power - a.voting_power)
        .map((item, index) => {
          return {
            value: item.voting_power / 10 ** 8,
            finalizer: item.pub_key,
            tag: '',
            svg: { fill: randomColors[index] },
            color: randomColors[index],
            labelLineConfig: {
              color: randomColors[index],
            },
            key: `pie-${index}`,
          };
        });
      console.log(newPieAmounts);
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
    const numLines = item.finalizer.length < 40 ? 2 : item.finalizer.length / (dimensions.width < 500 ? 21 : 30);
    return (
      <View style={{ width: '100%' }} key={`tag-${index}`}>
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 5,
            borderBottomColor: '#333333',
            borderBottomWidth: 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {(!expandAddress[index] || item.finalizer === 'fee') && (
              <FontAwesomeIcon style={{ margin: 5 }} size={45} icon={faQrcode} color={item.svg.fill} />
            )}
            {!!item.tag && <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>}
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(item.finalizer);
                addLastSnackbar({
                  message: translate('history.addresscopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
                selectExpandAddress(index);
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'wrap',
                }}>
                <AddressItem address={item.finalizer} screenName={screenName} oneLine={true} onlyContact={true} withIcon={true} />
                {!expandAddress[index] && !!item.finalizer && (
                  <RegText>
                    {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(item.finalizer, dimensions.width < 500 ? 5 : 10)
                      : item.finalizer}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.finalizer &&
                  Utils.splitStringIntoChunks(item.finalizer, Number(numLines.toFixed(0))).map(
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
              flexDirection: 'column-reverse',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <RegText>{getPercent(percent)}</RegText>
            <ZecAmount
              currencyName={info.currencyName}
              size={15}
              amtZec={item.value}
              style={{ marginHorizontal: 5 }}
              privacy={privacy}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderExternalLabel = useCallback(
    (item: pieDataItem | undefined) => (
      <SvgText fontSize={12} fill={item?.color}>
        {Number(item?.value.toFixed(2))}
      </SvgText>
    ),
    [],
  );

  //console.log('render insight');

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>

        <HeaderTitle title='Distribution' goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }} />

        <View 
          style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20, 
            borderRadius: 20,
            backgroundColor: 'rgba(118, 118, 128, 0.24)', 
            padding: 5,
            marginHorizontal: 20,
          }}>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'my' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}>
            <TouchableOpacity onPress={() => setTab('my')}>
              <RegText
                style={{
                  fontWeight: tab === 'my' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text,
                }}>
                {'My Staking'}
              </RegText>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'network' ? '#6C6C71' : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}>
            <TouchableOpacity onPress={() => setTab('network')}>
              <RegText
                style={{
                  fontWeight: tab === 'network' ? 'bold' : 'normal',
                  fontSize: 15,
                  color: colors.text
                }}>
                {'Global Network'}
              </RegText>
            </TouchableOpacity>
          </View>
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
              <View style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}>
                {!!pieAmounts && !!pieAmounts.length && (
                  <PieChart
                    showExternalLabels={true}
                    labelLineConfig={{
                      thickness: 1,
                      avoidOverlappingOfLabels: true,
                    }}
                    strokeWidth={4}
                    donut={true}
                    innerCircleColor={colors.background}
                    innerCircleBorderWidth={0}
                    innerCircleBorderColor={colors.background}
                    strokeColor={colors.background}
                    showValuesAsTooltipText={true}
                    showText
                    externalLabelComponent={renderExternalLabel}
                    textBackgroundColor={colors.background}
                    data={pieAmounts}
                    innerRadius={dimensions.width * 0.09}
                  />
                )}
              </View>
            )}
          </View>
          <View style={{ display: 'flex', marginHorizontal: 5, padding: 0, alignItems: 'center' }}>
            <View style={{ width: '100%' }}>
              {!loading && !!pieAmounts && !!pieAmounts.length && (
                <>
                  {pieAmounts
                    .map((item, index) => {
                      return line(item, index);
                    })}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </ToastProvider>
  );
};

export default Distribution;
