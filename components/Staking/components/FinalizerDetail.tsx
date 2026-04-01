/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import { GlobalConst, RouteEnum } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { useToast } from 'react-native-toastier';
import { HeaderTitle } from '../../Header';
import Utils from '../../../app/utils';
import ZecAmount from '../../Components/ZecAmount';
import { TriangleAlertIcon } from 'lucide-react-native';

type DataType = {
  svg: {
    data: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
};

type FinalizerDetailProps = {
  item: DataType | null;
  closeSheet: () => void;
  setHeightLayout: (h: number) => void;
  stakingDay: boolean;
};
const FinalizerDetail: React.FunctionComponent<FinalizerDetailProps> = ({
  item,
  closeSheet,
  setHeightLayout,
  stakingDay,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const { info } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();

  return (
    <View
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(
          height + (Platform.OS === GlobalConst.platformOSios ? 120 : 80),
        );
      }}
      style={{
        backgroundColor: 'rgba(36, 36, 38, 1)',
        paddingTop: 15,
        borderTopLeftRadius: 38,
        borderTopRightRadius: 38,
      }}
    >
      <HeaderTitle
        title={item?.finalizer ? Utils.trimToSmall(item.finalizer, 7) : ''}
        goBack={() => {
          clear();
          closeSheet();
        }}
        bottomSheet={true}
      />
      <View style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
        <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
          {'Your deposited amount'}
        </RegText>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <View
            accessible={true}
            style={{
              flexGrow: 1,
              justifyContent: 'flex-start',
              borderRadius: 25,
              backgroundColor: colors.background,
              paddingHorizontal: 20,
              paddingVertical: 15,
            }}
          >
            <ZecAmount
              amtZec={item?.value}
              size={18}
              currencyName={info.currencyName}
            />
          </View>
        </View>

        {true ? (
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 5,
              marginTop: 20,
              marginBottom: 20,
            }}
          >
            <Button
              variant="primary"
              title={'Redelegate'}
              onPress={() => {
                clear();
                navigation.navigate(RouteEnum.Redelegate, {
                  finalizer: item?.finalizer,
                  staked: item?.value,
                  closeSheet: closeSheet,
                  stakingDay,
                });
              }}
            />
            <Button
              variant="secondary"
              title={'Unstake'}
              style={{ marginLeft: 10 }}
              onPress={() => {
                clear();
                navigation.navigate(RouteEnum.Unstake, {
                  finalizer: item?.finalizer,
                  staked: item?.value,
                  closeSheet: closeSheet,
                  stakingDay,
                });
              }}
            />
          </View>
        ) : (
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                marginTop: 20,
                marginBottom: 20,
                paddingHorizontal: 15,
                paddingVertical: 7,
                backgroundColor: '#222223',
                borderColor: '#414141',
                borderWidth: 1,
                borderRadius: 16,
                marginHorizontal: 25,
                alignSelf: 'stretch',
              }}
            >
              <View
                style={{
                  flexDirection: 'column',
                  gap: 10,
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  flexShrink: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <TriangleAlertIcon color={'#FFFFFF'} size={20} />
                  <RegText
                    style={{ fontSize: 16, marginLeft: 5, fontWeight: '400' }}
                  >
                    {' '}
                    Staking actions are currently disabled
                  </RegText>
                </View>

                <RegText
                  style={{
                    color: '#8E8E93',
                    marginLeft: 30,
                    fontSize: 14,
                    fontWeight: '400',
                  }}
                >
                  They will only be available during the next staking day
                </RegText>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(FinalizerDetail);
