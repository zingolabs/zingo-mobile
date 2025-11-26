/* eslint-disable react-native/no-inline-styles */
//import React, { useContext, useState } from 'react';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { ButtonTypeEnum, RouteEnum } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
//import { ContextAppLoaded } from '../../context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import Button from '../../../components/Components/Button';
import FadeText from '../../../components/Components/FadeText';


type ComputingErrorProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.ComputingError>;

const ComputingError: React.FunctionComponent<ComputingErrorProps> = ({
  route,
}) => {
  const navigation: any = useNavigation();
  //const context = useContext(ContextAppLoaded);
  //const { valueTransfers } = context;
  const { colors } = useTheme() as ThemeType;

  const [showDetails, setShowDetails] = useState<boolean>(false);

  const error = !!route.params && route.params.error !== undefined ? route.params.error : '';

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
                backgroundColor: '#FF383C33',
                padding: 20,
                margin: 10,
              }}
            >
              <FontAwesomeIcon
                icon={faXmark}
                color='#FF383C'
                size={50}
              />
            </View>
          </View>
          <RegText style={{ fontSize: 30, alignSelf: 'center' }}>{'An error\noccurred'}</RegText>

          <View
            style={{
              marginTop: 50,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 20,
            }}
          >
            <Button
              type={ButtonTypeEnum.Secondary}
              title={'Details'}
              onPress={() => {
                setShowDetails(true);
              }}
              twoButtons={true}
            />
            <Button
              type={ButtonTypeEnum.Primary}
              style={{ marginLeft: 10 }}
              title={'Back'}
              onPress={() => {
                navigation.navigate(RouteEnum.MainTabs, { screen: RouteEnum.History });
              }}
              twoButtons={true}
            />
          </View>

          {showDetails && (
            <FadeText style={{ opacity: 1 }}>{error}</FadeText>
          )}
        </View>

      </View>
    </View>
  );
};

export default ComputingError;
