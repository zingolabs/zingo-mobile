/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { RouteEnum, SendPageStateClass } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import PaperPlane from '../../../assets/icons/paper-plane.svg';
import Utils from '../../utils';
import ZecAmount from '../../../components/Components/ZecAmount';
import { ContextAppLoaded } from '../../context';


type ComputingProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Computing>;

const Computing: React.FunctionComponent<ComputingProps> = ({
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const { info, privacy } = context;
  const { colors } = useTheme() as ThemeType;

  const sendPageStatePar = !!route.params && route.params.sendPageStatePar !== undefined ? route.params.sendPageStatePar : {} as SendPageStateClass;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
      }}>
        <View 
          style={{
            backgroundColor: colors.secondary,
            padding: 50,
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
                borderRadius: 45,
                backgroundColor: '#1C78D24D',
                padding: 20,
                margin: 10,
              }}
            >
              <PaperPlane width={40} height={40} />
            </View>
          </View>
          <RegText style={{ fontSize: 30, alignSelf: 'center' }}>Sending</RegText>
          <ActivityIndicator size="large" color={colors.text} style={{ marginVertical: 20 }} />
        </View>
        <View 
          style={{
            marginTop: 20,
            backgroundColor: colors.secondary,
            padding: 50,
            width: '90%',
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZecAmount
            currencyName={info.currencyName}
            color={colors.text}
            size={20}
            amtZec={Utils.parseStringLocaleToNumberFloat(sendPageStatePar.toaddr.amount)}
            privacy={privacy}
            style={{ fontWeight: '900', marginBottom: 20 }}
          />
          <RegText>{`To: ${Utils.trimToSmall(sendPageStatePar.toaddr.to, 10)}`}</RegText>
        </View>
      </View>
    </View>
  );
};

export default Computing;
