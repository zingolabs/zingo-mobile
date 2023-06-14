/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Toast from 'react-native-simple-toast';

import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import RPC from '../../app/rpc';
import FadeText from '../Components/FadeText';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type ShowUfvkProps = {
  onClickOK: () => void;
  onClickCancel: () => void;
  action: 'change' | 'view' | 'backup' | 'server';
};
const ShowUfvk: React.FunctionComponent<ShowUfvkProps> = ({ onClickOK, onClickCancel, action }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, wallet, server, netInfo } = context;
  const { ufvk } = wallet;
  const { colors } = useTheme() as unknown as ThemeType;
  const [times, setTimes] = useState(0);
  const [texts, setTexts] = useState({} as TextsType);

  useEffect(() => {
    const buttonTextsArray = translate('privkey.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(action === 'change' || action === 'backup' || action === 'server' ? 1 : 0);
  }, [action, translate]);

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
  }, []);

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
        title={translate('privkey.viewkey') + ' (' + translate(`seed.${action}`) + ')'}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
      />

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
          {translate('privkey.text-readonly') as string}
        </FadeText>

        {times === 3 && action === 'change' && (
          <FadeText style={{ padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('privkey.change-warning') as string}
          </FadeText>
        )}
        {times === 3 && action === 'backup' && (
          <FadeText style={{ padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('privkey.backup-warning') as string}
          </FadeText>
        )}
        {times === 3 && action === 'server' && (
          <FadeText style={{ padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('privkey.server-warning') as string}
          </FadeText>
        )}

        {server.chain_name !== 'main' && times === 3 && (action === 'change' || action === 'server') && (
          <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%' }}>
            {translate('seed.mainnet-warning') as string}
          </FadeText>
        )}

        <View style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center' }}>
          <SingleAddress
            address={ufvk || ''}
            addressKind={'u'}
            index={0}
            total={1}
            prev={() => null}
            next={() => null}
          />
        </View>

        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button
          type="Primary"
          style={{
            backgroundColor: times === 3 ? 'red' : colors.primary,
            color: times === 3 ? 'white' : colors.primary,
          }}
          title={!!texts && !!texts[action] ? texts[action][times] : ''}
          onPress={() => {
            if (!ufvk) {
              return;
            }
            if (!netInfo.isConnected && times > 0) {
              Toast.show(translate('loadedapp.connection-error') as string, Toast.LONG);
              return;
            }
            if (times === 0 || times === 3) {
              onClickOK();
            } else if (times === 1 || times === 2) {
              setTimes(times + 1);
            }
          }}
        />
        {times > 0 && (
          <Button
            type="Secondary"
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={onClickCancel}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ShowUfvk;
