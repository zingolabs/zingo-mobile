/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { useTheme } from '../../app/theme';
import { PieChart, pieDataItem } from 'react-native-gifted-charts';
import { Text as SvgText } from 'react-native-svg';
import { faChevronLeft, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import Clipboard from '@react-native-clipboard/clipboard';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import RegText from '../../ui/primitives/RegText';
import BoldText from '../../ui/primitives/BoldText';
import SheetRim from '../../ui/primitives/SheetRim';
import ZecAmount from '../../ui/widgets/ZecAmount';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Utils from '../../app/utils';
import FadeText from '../../ui/primitives/FadeText';
import Header from '../../ui/widgets/Header';
import {
  getTotalMemobytesToAddress,
  getTotalSpendsToAddress,
  getTotalValueToAddress,
} from '../../app/walletBackend';
import AddressItem from '../../ui/widgets/AddressItem';
import {
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

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
  return (
    (percent < 1
      ? '<1'
      : percent < 100 && percent >= 99
        ? '99'
        : percent.toFixed(0)) + '%'
  );
};

type InsightProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Insight
>;

const Insight: React.FunctionComponent<InsightProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, privacy, addLastSnackbar, setPrivacyOption } =
    context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Insight;

  const [pieAmounts, setPieAmounts] = useState<DataType[]>([]);
  const [expandAddress, setExpandAddress] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'sent' | 'sends' | 'memobytes'>('sent');
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const insightSheetRef = useRef<BottomSheet>(null);
  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const insightSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderInsightHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.fgAccent}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('insight.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      let resultStr: string = '';
      switch (tab) {
        case 'sent': {
          const result = await getTotalValueToAddress();
          resultStr = result.ok ? result.value : '';
          break;
        }
        case 'sends': {
          const result = await getTotalSpendsToAddress();
          resultStr = result.ok ? result.value : '';
          break;
        }
        case 'memobytes': {
          const result = await getTotalMemobytesToAddress();
          resultStr = result.ok ? result.value : '';
          break;
        }
        default:
          break;
      }
      let resultJSON: Record<string, unknown>;
      try {
        resultJSON = await JSON.parse(resultStr);
      } catch (e) {
        resultJSON = {};
      }
      let amounts: { value: number; address: string; tag: string }[] = [];
      const resultJSONEntries: [string, number][] = Object.entries(
        resultJSON,
      ) as [string, number][];
      resultJSONEntries &&
        resultJSONEntries.forEach(([key, value]) => {
          if (!(tab !== 'sent' && key === 'fee')) {
            // excluding the fee for `sends` and `memobytes`.
            if (value > 0) {
              amounts.push({
                value: tab === 'sent' ? value / 10 ** 8 : value,
                address: key,
                tag: '',
              });
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
            svg: {
              fill: item.address === 'fee' ? colors.bgMuted : randomColors[index],
            },
            color: item.address === 'fee' ? colors.fgMuted : randomColors[index],
            labelLineConfig: {
              color:
                item.address === 'fee' ? colors.fgMuted : randomColors[index],
            },
            key: `pie-${index}`,
          };
        });
      setPieAmounts(newPieAmounts);
      const newExpandAddress = Array(newPieAmounts.length).fill(false);
      setExpandAddress(newExpandAddress);
      setLoading(false);
    })();
  }, [colors.bgMuted, colors.fgMuted, tab]);

  const selectExpandAddress = (index: number) => {
    let newExpandAddress = Array(expandAddress.length).fill(false);
    newExpandAddress[index] = true;
    setExpandAddress(newExpandAddress);
  };

  const line = (item: DataType, index: number) => {
    const totalValue = pieAmounts
      ? pieAmounts.reduce((acc, curr) => acc + curr.value, 0)
      : 0;
    const percent = (100 * item.value) / totalValue;
    // 30 characters per line
    const numLines =
      item.address.length < 40
        ? 2
        : item.address.length / (dimensions.width < 500 ? 21 : 30);
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
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {(!expandAddress[index] || item.address === 'fee') && (
              <FontAwesomeIcon
                style={{ margin: 5 }}
                size={36}
                icon={faQrcode}
                color={item.svg.fill}
              />
            )}
            {!!item.tag && (
              <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>
            )}
            <TouchableOpacity
              onPress={() => {
                if (item.address !== 'fee') {
                  Clipboard.setString(item.address);
                  addLastSnackbar(
                    translate('history.addresscopied') as string,
                    SnackbarDurationEnum.short,
                  );
                  selectExpandAddress(index);
                }
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'wrap',
                }}
              >
                {item.address !== 'fee' && (
                  <AddressItem
                    address={item.address}
                    screenName={screenName}
                    oneLine={true}
                    onlyContact={true}
                    withIcon={true}
                  />
                )}
                {!expandAddress[index] && !!item.address && (
                  <RegText>
                    {item.address.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.address,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.address}
                  </RegText>
                )}
                {expandAddress[index] &&
                  !!item.address &&
                  Utils.splitStringIntoChunks(
                    item.address,
                    Number(numLines.toFixed(0)),
                  ).map((c: string, idx: number) => (
                    <RegText color={item.svg.fill} key={idx}>
                      {c}
                    </RegText>
                  ))}
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection:
                expandAddress[index] && item.address !== 'fee'
                  ? 'column-reverse'
                  : 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RegText>{getPercent(percent)}</RegText>
            {tab === 'sent' ? (
              <ZecAmount
                currencyName={info.currencyName}
                size={12}
                amtZec={item.value}
                style={{ marginHorizontal: 5 }}
                privacy={privacy}
              />
            ) : (
              <RegText style={{ marginLeft: 10 }}>
                {'# ' +
                  item.value.toString() +
                  (tab === 'sends'
                    ? translate('insight.sends-unit')
                    : translate('insight.memobytes-unit'))}
              </RegText>
            )}
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
        />
      </View>
      <BottomSheet
        ref={insightSheetRef}
        snapPoints={insightSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderInsightHandle}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
          }}
        >
          <View style={{ width: '100%', flexDirection: 'row', marginTop: 10 }}>
            <TouchableOpacity onPress={() => setTab('sent')}>
              <View
                style={{
                  width: (dimensions.width - 20) / 3,
                  alignItems: 'center',
                  borderBottomColor: colors.borderAccent,
                  borderBottomWidth: tab === 'sent' ? 2 : 0,
                  paddingBottom: 10,
                }}
              >
                <RegText
                  style={{
                    fontWeight: tab === 'sent' ? 'bold' : 'normal',
                    fontSize: tab === 'sent' ? 15 : 14,
                    color: colors.fgDefault,
                  }}
                >
                  {translate('insight.sent') as string}
                </RegText>
                <RegText
                  style={{
                    fontSize: 11,
                    color: tab === 'sent' ? colors.fgAccent : colors.fgDefault,
                  }}
                >
                  ({translate('insight.sent-text') as string})
                </RegText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('sends')}>
              <View
                style={{
                  width: (dimensions.width - 20) / 3,
                  alignItems: 'center',
                  borderBottomColor: colors.borderAccent,
                  borderBottomWidth: tab === 'sends' ? 2 : 0,
                  paddingBottom: 10,
                }}
              >
                <RegText
                  style={{
                    fontWeight: tab === 'sends' ? 'bold' : 'normal',
                    fontSize: tab === 'sends' ? 15 : 14,
                    color: colors.fgDefault,
                  }}
                >
                  {translate('insight.sends') as string}
                </RegText>
                <RegText
                  style={{
                    fontSize: 11,
                    color: tab === 'sends' ? colors.fgAccent : colors.fgDefault,
                  }}
                >
                  ({translate('insight.sends-text') as string})
                </RegText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('memobytes')}>
              <View
                style={{
                  width: (dimensions.width - 20) / 3,
                  alignItems: 'center',
                  borderBottomColor: colors.borderAccent,
                  borderBottomWidth: tab === 'memobytes' ? 2 : 0,
                  paddingBottom: 10,
                }}
              >
                <RegText
                  style={{
                    fontWeight: tab === 'memobytes' ? 'bold' : 'normal',
                    fontSize: tab === 'memobytes' ? 15 : 14,
                    color: colors.fgDefault,
                  }}
                >
                  {translate('insight.memobytes') as string}
                </RegText>
                <RegText
                  style={{
                    fontSize: 11,
                    color: tab === 'memobytes' ? colors.fgAccent : colors.fgDefault,
                  }}
                >
                  ({translate('insight.memobytes-text') as string})
                </RegText>
              </View>
            </TouchableOpacity>
          </View>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle={'white'}
            bounces={false}
            alwaysBounceVertical={false}
            style={{ flex: 1 }}
            contentContainerStyle={{}}
          >
            <View style={{ display: 'flex', margin: 20 }}>
              {!loading && (!pieAmounts || !pieAmounts.length) && (
                <View
                  style={{
                    width: '100%',
                    alignItems: 'center',
                    marginTop: 100,
                  }}
                >
                  <RegText>{translate('insight.no-data') as string}</RegText>
                </View>
              )}
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.fgAccent}
                  style={{ marginTop: 100 }}
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    alignItems: 'center',
                    paddingVertical: 10,
                  }}
                >
                  {!!pieAmounts && !!pieAmounts.length && (
                    <PieChart
                      showExternalLabels={true}
                      labelLineConfig={{
                        thickness: 1,
                        avoidOverlappingOfLabels: true,
                      }}
                      strokeWidth={4}
                      donut={true}
                      innerCircleColor={colors.bgCanvas}
                      innerCircleBorderWidth={0}
                      innerCircleBorderColor={colors.bgCanvas}
                      strokeColor={colors.bgCanvas}
                      showValuesAsTooltipText={true}
                      showText
                      externalLabelComponent={renderExternalLabel}
                      textBackgroundColor={colors.bgCanvas}
                      data={pieAmounts}
                      innerRadius={dimensions.width * 0.09}
                    />
                  )}
                </View>
              )}
            </View>
            <View
              style={{
                display: 'flex',
                marginHorizontal: 5,
                padding: 0,
                alignItems: 'center',
              }}
            >
              <View style={{ width: '100%' }}>
                {!loading && !!pieAmounts && !!pieAmounts.length && (
                  <>
                    {pieAmounts
                      .filter(item => item.address === 'fee')
                      .map((item, index) => {
                        return line(item, index);
                      })}
                    <View
                      style={{ height: 1, backgroundColor: colors.bgAccent }}
                    />
                    {pieAmounts
                      .filter(item => item.address !== 'fee')
                      .map((item, index) => {
                        return line(item, index);
                      })}
                  </>
                )}
              </View>
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    </View>
  );
};

export default Insight;
