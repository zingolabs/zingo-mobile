/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { RouteEnum, ValueTransferType } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';

type ComputingOKProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.ComputingOK
>;

const ComputingOK: React.FunctionComponent<ComputingOKProps> = ({ route }) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const { valueTransfers } = context;
  const { colors } = useTheme() as ThemeType;

  const txid =
    !!route.params && route.params.txid !== undefined ? route.params.txid : '';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: colors.secondary,
            paddingHorizontal: 20,
            paddingVertical: 40,
            width: '90%',
            borderRadius: 50,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 8,
            }}
          >
            <View
              style={{
                borderRadius: 50,
                backgroundColor: '#34C75933',
                padding: 20,
                margin: 10,
              }}
            >
              <FontAwesomeIcon icon={faCheck} color="#34C759" size={50} />
            </View>
          </View>
          <RegText style={{ fontSize: 30, alignSelf: 'center' }}>Sent</RegText>

          <View
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 50,
              paddingBottom: 20,
              gap: 10,
            }}
          >
            <LiquidPrimaryButton
              tintColor={colors.secondary}
              title={'Details TX'}
              onPress={() => {
                // have to be the first element in the VT's -> index 0.
                // we cannot be 100% sure...
                const vt: ValueTransferType | undefined =
                  valueTransfers?.filter(
                    (v: ValueTransferType) => v.txid === txid,
                  )[0];
                navigation.navigate(RouteEnum.ValueTransferDetail, {
                  vt: vt,
                  totalLength:
                    valueTransfers !== null ? valueTransfers.length : 0,
                });
              }}
            />
            <LiquidPrimaryButton
              title={'Back'}
              onPress={() => {
                navigation.navigate(RouteEnum.MainTabs, {
                  screen: RouteEnum.History,
                });
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default ComputingOK;
