/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React, { Component } from 'react';
import { View, ScrollView, Alert, SafeAreaView, Image, Text } from 'react-native';

import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppearanceProvider } from 'react-native-appearance';
import { createStackNavigator } from '@react-navigation/stack';

import cstyles from './components/CommonStyles';
import { BoldText, RegText, RegTextInput, FadeText } from './components/Components';
import Button from './components/Button';
import RPCModule from './components/RPCModule';
import LoadedApp from './app/LoadedApp';
import { SERVER_URI } from './app/uris';
import SeedComponent from './components/SeedComponent';
import SettingsFileImpl from './components/SettingsFileImpl';
import RPC from './app/rpc';

// -----------------
// Loading View
// -----------------
type LoadingProps = {
  navigation: any;
};

type LoadingState = {
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  seedPhrase: string | null;
  birthday: string;
};

const SERVER_DEFAULT = SERVER_URI[0];

class LoadingView extends Component<LoadingProps, LoadingState> {
  constructor(props: Readonly<LoadingProps>) {
    super(props);

    this.state = {
      screen: 0,
      actionButtonsDisabled: false,
      walletExists: false,
      seedPhrase: null,
      birthday: '0',
      server: null,
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
      // console.log('Exists result', exists);

      if (exists && exists !== 'false') {
        this.setState({ walletExists: true });
        const error = await RPCModule.loadExistingWallet(settings.server || this.state.server);
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
  };

  getSpendableKeyToRestore = async () => {
    //this.setState({ spendableKey: '', birthday: '0', screen: 3 });
  };

  doRestore = async () => {
    // Don't call with null values
    const { birthday, seedPhrase } = this.state;

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

      const error = await RPCModule.restoreWallet(seedPhrase.toLowerCase(), walletBirthday || '0');
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

    // Refetch the settings to update
    //this.rpc.fetchWalletSettings();
  };

  render() {
    const { screen, birthday, seedPhrase, actionButtonsDisabled, walletExists, server } = this.state;

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
        {screen === 0 && <Text style={{ color: '#777777', fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>}
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
              <Text style={{ color: '#777777', fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>
              <Image
                source={require('./assets/img/logobig-zingo.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain' }}
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
            nextScreen={this.loadWallet}
          />
        )}
        {screen === 3 && (
          <ScrollView
            contentContainerStyle={[
              {
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
              },
            ]}
            keyboardShouldPersistTaps="handled">
            <RegText style={{ margin: 30 }}>Enter your seed phrase (24 words)</RegText>
            <RegTextInput
              multiline
              style={[
                {
                  maxWidth: '95%',
                  minWidth: '95%',
                  borderColor: '#351515',
                  borderWidth: 1,
                  minHeight: 100,
                },
                cstyles.innerpaddingsmall,
              ]}
              value={seedPhrase}
              onChangeText={(text: string) => this.setState({ seedPhrase: text })}
            />
            <RegText style={[cstyles.margintop, cstyles.center]}>Wallet Birthday</RegText>
            <FadeText>Block height of first transaction. (OK to leave blank)</FadeText>
            <RegTextInput
              style={[
                {
                  maxWidth: '50%',
                  minWidth: '50%',
                  borderColor: '#351515',
                  borderWidth: 1,
                },
                cstyles.innerpaddingsmall,
              ]}
              value={birthday}
              keyboardType="numeric"
              onChangeText={(text: string) => this.setState({ birthday: text })}
            />
            <View style={cstyles.margintop}>
              <Button type="Primary" title="Restore Wallet" disabled={actionButtonsDisabled} onPress={this.doRestore} />
            </View>
          </ScrollView>
        )}
      </View>
    );
  }
}

const Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#010101',
    card: '#401717',
    border: '#803434',
    primary: '#df4100',
    text: '#c08863',
  },
};

const Stack = createStackNavigator();
export default function App() {
  return (
    <AppearanceProvider>
      <NavigationContainer theme={Theme}>
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: Theme.colors.card,
          }}>
          <Stack.Navigator headerMode="none">
            <Stack.Screen name="LoadingView" component={LoadingView} />
            <Stack.Screen name="LoadedApp" component={LoadedApp} />
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </AppearanceProvider>
  );
}
