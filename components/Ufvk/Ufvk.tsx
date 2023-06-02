/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';

type UfvkProps = {
  onClickCancel: () => void;
  set_privacy_option: (
    name: 'server' | 'currency' | 'language' | 'sendAll' | 'privacy',
    value: boolean,
  ) => Promise<void>;
};
const Ufvk: React.FunctionComponent<UfvkProps> = ({ onClickCancel, set_privacy_option }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, wallet } = context;
  const { ufvk } = wallet;
  const { colors } = useTheme() as unknown as ThemeType;

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
        title={translate('privkey.viewkey') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        set_privacy_option={set_privacy_option}
      />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center', marginBottom: 30 }}>
          <SingleAddress
            address={ufvk || ''}
            addressKind={'u'}
            index={0}
            total={1}
            prev={() => null}
            next={() => null}
          />
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
        <Button type="Secondary" title={translate('close') as string} onPress={onClickCancel} />
      </View>
    </SafeAreaView>
  );
};

export default Ufvk;
