/* eslint-disable react-native/no-inline-styles */
import React, { Component, Suspense } from 'react';
import { View, Alert, SafeAreaView, Image, Text, Modal } from 'react-native';
import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { TranslateOptions } from 'i18n-js';

import BoldText from '../../components/Components/BoldText';
import Button from '../../components/Button';
import RPCModule from '../../components/RPCModule';
import { TotalBalance, SettingsFileEntry, InfoType } from '../AppState';
import { SERVER_URI } from '../uris';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import RPC from '../rpc';
import { ThemeType } from '../types';

const Seed = React.lazy(() => import('../../components/Seed'));

// -----------------
// Loading View
// -----------------

type LoadingAppProps = {
  navigation: any;
  route: any;
  translate: (key: string, config?: TranslateOptions) => any;
};

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme() as unknown as ThemeType;

  return <LoadingAppClass {...props} theme={theme} />;
}

type LoadingAppClassProps = {
  navigation: any;
  route: any;
  translate: (key: string, config?: TranslateOptions) => any;
  theme: ThemeType;
};

type LoadingAppClassState = {
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  seedPhrase: string | null;
  birthday: string;
  server: string;
  totalBalance: TotalBalance;
  info: InfoType | null;
};

const SERVER_DEFAULT_0 = SERVER_URI[0];
const SERVER_DEFAULT_1 = SERVER_URI[1];

class LoadingAppClass extends Component<LoadingAppClassProps, LoadingAppClassState> {
  constructor(props: Readonly<LoadingAppClassProps>) {
    super(props);

    this.state = {
      screen: 0,
      actionButtonsDisabled: false,
      walletExists: false,
      seedPhrase: null,
      birthday: '0',
      server: '',
      totalBalance: new TotalBalance(),
      info: null,
    };
  }

  componentDidMount = async () => {
    // First, check if a wallet exists. Do it async so the basic screen has time to render
    setTimeout(async () => {
      // reading Info
      const info = await RPC.rpc_getInfoObject();
      this.setState({ info });
      // read settings file
      let settings: SettingsFileEntry = {};
      if (!this.state.server) {
        settings = await SettingsFileImpl.readSettings();
        if (!!settings && !!settings.server) {
          this.setState({ server: settings.server });
        } else {
          settings.server = SERVER_DEFAULT_0;
          this.setState({ server: SERVER_DEFAULT_0 });
          await SettingsFileImpl.writeSettings(new SettingsFileEntry(SERVER_DEFAULT_0));
        }
      }

      const exists = await RPCModule.walletExists();
      //console.log('Wallet Exists result', exists);

      if (exists && exists !== 'false') {
        this.setState({ walletExists: true });
        const error = await RPCModule.loadExistingWallet(settings.server || this.state.server || SERVER_DEFAULT_0);
        //console.log('Load Wallet Exists result', error);
        if (!error.startsWith('Error')) {
          // Load the wallet and navigate to the transactions screen
          this.navigateToLoaded();
        } else {
          this.setState({ screen: 1 });
          Alert.alert(this.props.translate('loadingapp.readingwallet-label'), error);
        }
      } else {
        //console.log('Loading new wallet');
        this.setState({ screen: 1, walletExists: false });
      }
    });
  };

  useDefaultServer_0 = async () => {
    this.setState({ actionButtonsDisabled: true });
    await SettingsFileImpl.writeSettings(new SettingsFileEntry(SERVER_DEFAULT_0));
    this.setState({ server: SERVER_DEFAULT_0, actionButtonsDisabled: false });
  };

  useDefaultServer_1 = async () => {
    this.setState({ actionButtonsDisabled: true });
    await SettingsFileImpl.writeSettings(new SettingsFileEntry(SERVER_DEFAULT_0));
    this.setState({ server: SERVER_DEFAULT_1, actionButtonsDisabled: false });
  };

  navigateToLoaded = () => {
    const { navigation } = this.props;
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoadedApp' }],
    });
  };

  createNewWallet = () => {
    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      const seed = await RPCModule.createNewWallet(this.state.server);

      if (!seed.startsWith('Error')) {
        this.setState({ seedPhrase: seed, screen: 2, actionButtonsDisabled: false, walletExists: true });
        // default values for wallet options
        this.set_wallet_option('download_memos', 'wallet');
        //await this.set_wallet_option('transaction_filter_threshold', '500');
      } else {
        this.setState({ walletExists: false, actionButtonsDisabled: false });
        Alert.alert(this.props.translate('loadingapp.creatingwallet-label'), seed);
      }
    });
  };

  getSeedPhraseToRestore = async () => {
    this.setState({ seedPhrase: '', birthday: '0', screen: 3, walletExists: false });
  };

  getViewingKeyToRestore = async () => {
    //this.setState({ viewingKey: '', birthday: '0', screen: 3 });
    Toast.show(this.props.translate('workingonit'), Toast.LONG);
  };

  getSpendableKeyToRestore = async () => {
    //this.setState({ spendableKey: '', birthday: '0', screen: 3 });
    Toast.show(this.props.translate('workingonit'), Toast.LONG);
  };

  doRestore = async (seedPhrase: string, birthday: number) => {
    // Don't call with null values
    const { server } = this.state;

    if (!seedPhrase) {
      Alert.alert(
        this.props.translate('loadingapp.invalidseed-label'),
        this.props.translate('loadingapp.invalidseed-error'),
      );
      return;
    }

    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      let walletBirthday = birthday.toString() || '0';
      if (parseInt(walletBirthday, 10) < 0) {
        walletBirthday = '0';
      }
      if (isNaN(parseInt(walletBirthday, 10))) {
        walletBirthday = '0';
      }

      const error = await RPCModule.restoreWallet(seedPhrase.toLowerCase(), walletBirthday || '0', server);
      if (!error.startsWith('Error')) {
        this.setState({ actionButtonsDisabled: false });
        this.navigateToLoaded();
      } else {
        this.setState({ actionButtonsDisabled: false });
        Alert.alert(this.props.translate('loadingapp.readingwallet-label'), error);
      }
    });
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.rpc_setWalletSettingOption(name, value);
  };

  render() {
    const { screen, seedPhrase, actionButtonsDisabled, walletExists, server, totalBalance, info } = this.state;
    const { colors } = this.props.theme;
    const { translate } = this.props;

    const currencyName = info ? info.currencyName : undefined;

    return (
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          backgroundColor: colors.background,
        }}>
        {screen === 0 && (
          <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>{translate('zingo')}</Text>
        )}
        {screen === 1 && (
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{ marginBottom: 50, display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>{translate('zingo')}</Text>
              <Image
                source={require('../../assets/img/logobig-zingo.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 10 }}
              />
            </View>

            <BoldText style={{ fontSize: 15, marginBottom: 3 }}>{translate('loadingapp.actualserver')}</BoldText>
            <BoldText style={{ fontSize: 15, marginBottom: 10 }}>{server})</BoldText>

            {server === SERVER_DEFAULT_1 && (
              <Button
                type="Primary"
                title={translate('loadingapp.changeserver')}
                disabled={actionButtonsDisabled}
                onPress={this.useDefaultServer_0}
                style={{ marginBottom: 10 }}
              />
            )}
            {server === SERVER_DEFAULT_0 && (
              <Button
                type="Primary"
                title={translate('loadingapp.changeserver')}
                disabled={actionButtonsDisabled}
                onPress={this.useDefaultServer_1}
                style={{ marginBottom: 10 }}
              />
            )}
            {server !== SERVER_DEFAULT_0 && server !== SERVER_DEFAULT_1 && (
              <Button
                type="Primary"
                title={translate('loadingapp.changeserver')}
                disabled={actionButtonsDisabled}
                onPress={this.useDefaultServer_0}
                style={{ marginBottom: 10 }}
              />
            )}

            <Button
              type="Primary"
              title={translate('loadingapp.createnewwallet')}
              disabled={actionButtonsDisabled}
              onPress={this.createNewWallet}
              style={{ marginBottom: 10, marginTop: 10 }}
            />
            {walletExists && (
              <Button
                type="Primary"
                title={translate('loadingapp.opencurrentwallet')}
                disabled={actionButtonsDisabled}
                onPress={this.componentDidMount}
                style={{ marginBottom: 10 }}
              />
            )}

            <View style={{ marginTop: 50, display: 'flex', alignItems: 'center' }}>
              <Button
                type="Secondary"
                title={translate('loadingapp.restorewalletseed')}
                disabled={actionButtonsDisabled}
                onPress={this.getSeedPhraseToRestore}
                style={{ margin: 10 }}
              />
              <Button
                type="Secondary"
                title={translate('loadingapp.restorewalletviewing')}
                disabled={actionButtonsDisabled}
                onPress={this.getViewingKeyToRestore}
                style={{ margin: 10 }}
              />
              <Button
                type="Secondary"
                title={translate('loadingapp.restorewalletspendable')}
                disabled={actionButtonsDisabled}
                onPress={this.getSpendableKeyToRestore}
                style={{ margin: 10 }}
              />
            </View>
          </View>
        )}
        {screen === 2 && seedPhrase && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={screen === 2}
            onRequestClose={() => this.navigateToLoaded()}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                seed={JSON.parse(seedPhrase)?.seed}
                birthday={JSON.parse(seedPhrase)?.birthday}
                onClickOK={() => this.navigateToLoaded()}
                onClickCancel={() => this.navigateToLoaded()}
                totalBalance={totalBalance}
                action={'new'}
                currencyName={currencyName || undefined}
                translate={translate}
              />
            </Suspense>
          </Modal>
        )}
        {screen === 3 && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={screen === 3}
            onRequestClose={() => this.setState({ screen: 1 })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading')}</Text>
                </View>
              }>
              <Seed
                onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                onClickCancel={() => this.setState({ screen: 1 })}
                totalBalance={totalBalance}
                action={'restore'}
                currencyName={currencyName || undefined}
                translate={translate}
              />
            </Suspense>
          </Modal>
        )}
      </SafeAreaView>
    );
  }
}
