/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import { ButtonTypeEnum, RouteEnum } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { useToast } from 'react-native-toastier';
import { HeaderTitle } from '../../Header';
import Utils from '../../../app/utils';
import ZecAmount from '../../Components/ZecAmount';

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
};
const FinalizerDetail: React.FunctionComponent<FinalizerDetailProps> = ({
  item,
  closeSheet,
  setHeightLayout,
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
        setHeightLayout(height + 80);
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

        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
            marginTop: 30,
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={'Redelegate'}
            onPress={() => {
              clear();
              setTimeout(() => {
                closeSheet();
              }, 100);
              navigation.navigate(RouteEnum.Redelegate, {
                finalizer: item?.finalizer,
                staked: item?.value,
              });
            }}
            twoButtons={true}
          />
          <Button
            type={ButtonTypeEnum.Secondary}
            title={'Unstake'}
            style={{ marginLeft: 10 }}
            onPress={() => {
              clear();
              setTimeout(() => {
                closeSheet();
              }, 100);
              navigation.navigate(RouteEnum.Unstake, {
                finalizer: item?.finalizer,
                staked: item?.value,
              });
            }}
            twoButtons={true}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(FinalizerDetail);
