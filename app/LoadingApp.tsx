/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React, { Component } from 'react';
import { View, ScrollView, Alert, SafeAreaView, Image, Text } from 'react-native';

import Toast from 'react-native-simple-toast';
import {useTheme} from '@react-navigation/native';

import cstyles from '../components/CommonStyles';
import { BoldText, RegText, RegTextInput, FadeText, ZecAmount, UsdAmount, zecPrice } from '../components/Components';
import Button from '../components/Button';
import RPCModule from '../components/RPCModule';
import LoadedApp from './LoadedApp';
import { TotalBalance } from './AppState';
import { SERVER_URI } from './uris';
import SeedComponent from '../components/SeedComponent';
import SettingsFileImpl from '../components/SettingsFileImpl';
import RPC from './rpc';

// -----------------
// Loading View
// -----------------

export default function LoadingApp(props) {
  const theme = useTheme();

  return <LoadingAppClass {...props} theme={theme} />;
}

type LoadingAppClassProps = {
  navigation: any;
};

type LoadingAppClassState = {
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  seedPhrase: string | null;
  birthday: string;
  totalBalance: TotalBalance;
};

const SERVER_DEFAULT = SERVER_URI[0];

class LoadingAppClass extends Component<LoadingAppClassProps, LoadingAppClassState> {
  constructor(props: Readonly<LoadingProps>) {
    super(props);

    this.state = {
      screen: 0,
      actionButtonsDisabled: false,
      walletExists: false,
      seedPhrase: null,
      birthday: '0',
      server: null,
      totalBalance: new TotalBalance,
    };
  }

  componentDidMount = async () => {
    // First, check if a wallet exists. Do it async so the basic screen has time to render
    setTimeout(async () => {
      // read settings file
      let settings = {};
      if (!this.state.server) {
        settings = await SettingsFileImpl.readSettings();
        if (settings && settings.server) {
          this.setState({ server: settings.server });
        } else {
          settings.server = SERVER_DEFAULT;
          this.setState({ server: SERVER_DEFAULT });
          await SettingsFileImpl.writeSettings({ server: SERVER_DEFAULT });
        }
      }

      const exists = await RPCModule.walletExists();
      console.log('Wallet Exists result', exists);

      if (exists && exists !== 'false') {
        this.setState({ walletExists: true });
        const error = await RPCModule.loadExistingWallet(settings.server || this.state.server);
        console.log('Load Wallet Exists result', error);
        if (!error.startsWith('Error')) {
          // Load the wallet and navigate to the transactions screen
          this.navigateToLoaded();
        } else {
          Alert.alert('Error Reading Wallet', error);
          this.setState({ screen: 1 });
        }
      } else {
        // console.log('Loading new wallet');
        this.setState({ screen: 1, walletExists: false });
      }
    });
  };

  useDefaultServer = async () => {
    this.setState({ server: SERVER_DEFAULT });
    await SettingsFileImpl.writeSettings({ server: SERVER_DEFAULT });
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
        this.set_wallet_option('download_memos', 'none');
        this.setState({ seedPhrase: seed, screen: 2 });
      } else {
        this.setState({ actionButtonsDisabled: false });
        Alert.alert('Error creating Wallet', seed);
      }
    });
  };

  getSeedPhraseToRestore = async () => {
    this.setState({ seedPhrase: '', birthday: '0', screen: 3 });
  };

  getViewingKeyToRestore = async () => {
    //this.setState({ viewingKey: '', birthday: '0', screen: 3 });
    Toast.show('We are working on it, comming soon.', Toast.LONG);
  };

  getSpendableKeyToRestore = async () => {
    //this.setState({ spendableKey: '', birthday: '0', screen: 3 });
    Toast.show('We are working on it, comming soon.', Toast.LONG);
  };

  doRestore = async (seedPhrase, birthday) => {
    // Don't call with null values
    const { server } = this.state;

    if (!seedPhrase) {
      Alert.alert('Invalid Seed Phrase', 'The seed phrase was invalid');
      return;
    }

    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      let walletBirthday = birthday || '0';
      if (parseInt(walletBirthday, 10) < 0) {
        walletBirthday = '0';
      }
      if (isNaN(parseInt(walletBirthday, 10))) {
        walletBirthday = '0';
      }

      const error = await RPCModule.restoreWallet(seedPhrase.toLowerCase(), walletBirthday || '0', server);
      if (!error.startsWith('Error')) {
        this.navigateToLoaded();
      } else {
        this.setState({ actionButtonsDisabled: false });
        Alert.alert('Error reading Wallet', error);
      }
    });
  };

  loadWallet = () => {
    this.navigateToLoaded();
  };

  set_wallet_option = async (name: string, value: string) => {
    await RPC.setWalletSettingOption(name, value);
  };

  render() {
    const { screen, birthday, seedPhrase, actionButtonsDisabled, walletExists, server, totalBalance } = this.state;
    const { colors } = this.props.theme;

    return (
      <View
        style={[
          {
            flexDirection: 'column',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        {screen === 0 && <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}> Zingo!</Text>}
        {screen === 1 && (
          <View
            style={[
              {
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}>
            <View style={{ marginBottom: 50, display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}> Zingo!</Text>
              <Image
                source={require('../assets/img/logobig-zingo.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 10 }}
              />
            </View>

            <Button type="Primary" title="Create New Wallet (new seed)" disabled={actionButtonsDisabled} onPress={this.createNewWallet} style={{ marginBottom: 10 }} />
            {walletExists && (
              <Button type="Primary" title="Open Current wallet" disabled={actionButtonsDisabled} onPress={this.componentDidMount} style={{ marginBottom: 10 }} />
            )}
            {server !== SERVER_DEFAULT && (
              <>
                <BoldText style={{ fontSize: 12, marginBottom: 3 }}>(server: {server})</BoldText>
                <Button type="Primary" title="Use Default Server" disabled={actionButtonsDisabled} onPress={this.useDefaultServer} style={{ marginBottom: 10 }} />
              </>
            )}
            <View style={[cstyles.margintop, { display: 'flex', alignItems: 'center' }]}>
              <Button type="Secondary" title="Restore wallet from Seed" onPress={this.getSeedPhraseToRestore} style={{ margin: 10 }} />
              <Button type="Secondary" title="Restore wallet from viewing key" onPress={this.getViewingKeyToRestore} style={{ margin: 10 }} />
              <Button type="Secondary" title="Restore wallet from spendable key" onPress={this.getSpendableKeyToRestore} style={{ margin: 10 }} />
            </View>
          </View>
        )}
        {screen === 2 && seedPhrase && (
          <SeedComponent
            seed={JSON.parse(seedPhrase)?.seed}
            birthday={JSON.parse(seedPhrase)?.birthday}
            onClickOK={this.loadWallet}
            totalBalance={totalBalance}
            action={"new"}
          />
        )}
        {screen === 3 && (
          <>
            <SeedComponent
              onClickOK={(s, b) => {
                this.doRestore(s, b);
              }}
              onClickCancel={() => this.setState({ screen: 1 })}
              totalBalance={totalBalance}
              action={"restore"}
            />
          </>
        )}
      </View>
    );
  }
}
