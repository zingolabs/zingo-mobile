/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import Button from '../Components/Button';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import {
  ButtonTypeEnum,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';

type RescanProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Rescan> & {
  doRescan: () => Promise<void>;
};

const Rescan: React.FunctionComponent<RescanProps> = ({
  navigation,
  doRescan,
}) => {
  const context = useContext(ContextAppLoaded);
  const { birthday, translate, netInfo, addLastSnackbar, selectServer } =
    context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Rescan;

  const doRescanAndClose = async () => {
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }
    // was removed the `await` here because launching the rescan can
    // take a lot of time and it's better the App responsive.
    doRescan();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    setTimeout(() => {
      // because this message is between screens.
      addLastSnackbar(
        translate('loadedapp.syncing') as string,
        SnackbarDurationEnum.longer,
      );
    }, 3 * 1000);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Header
        title={translate('rescan.title') as string}
        screenName={screenName}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
        closeScreen={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
      <ScrollView
        style={{ height: '80%', maxHeight: '80%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <RegText>
            {(translate('rescan.text-1') as string) +
              birthday +
              translate('rescan.text-2')}
          </RegText>
        </View>
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}
      >
        <Button
          type={ButtonTypeEnum.Primary}
          title={translate('rescan.button') as string}
          onPress={doRescanAndClose}
        />
      </View>
    </View>
  );
};

export default Rescan;
