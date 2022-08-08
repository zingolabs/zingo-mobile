/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React, { Component } from 'react';
import { View, ScrollView, Alert, SafeAreaView, Image, Text } from 'react-native';

import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppearanceProvider } from 'react-native-appearance';
import { createStackNavigator } from '@react-navigation/stack';
import {useTheme} from '@react-navigation/native';
import Toast from 'react-native-simple-toast';

import cstyles from './components/CommonStyles';
import { BoldText, RegText, RegTextInput, FadeText, ZecAmount, UsdAmount, zecPrice } from './components/Components';
import Button from './components/Button';
import RPCModule from './components/RPCModule';
import LoadedApp from './app/LoadedApp';
import { TotalBalance } from './app/AppState';
import { SERVER_URI } from './app/uris';
import SeedComponent from './components/SeedComponent';
import SettingsFileImpl from './components/SettingsFileImpl';
import RPC from './app/rpc';

// -----------------
// Loading View
// -----------------

const LoadingView = (props) => {
  const theme = useTheme();

  return <LoadingViewClass {...props} theme={theme} />;
}

type LoadingViewClassProps = {
  navigation: any;
};

type LoadingViewClassState = {
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  seedPhrase: string | null;
  birthday: string;
};

const SERVER_DEFAULT = SERVER_URI[0];

class LoadingViewClass extends Component<LoadingViewClassProps, LoadingViewClassState> {
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
    Toast.show('We are working on it, comming soon.', Toast.LONG);
  };

  getSpendableKeyToRestore = async () => {
    //this.setState({ spendableKey: '', birthday: '0', screen: 3 });
    Toast.show('We are working on it, comming soon.', Toast.LONG);
  };

  doRestore = async () => {
    // Don't call with null values
    const { birthday, seedPhrase, server } = this.state;

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

    // Refetch the settings to update
    //this.rpc.fetchWalletSettings();
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
        {screen === 0 && <Text style={{ color: colors.zingozcash, fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>}
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
              <Text style={{ color: colors.zingozcash, fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>
              <Image
                source={require('./assets/img/logobig-zingo.png')}
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
            nextScreen={this.loadWallet}
            totalBalance={totalBalance}
          />
        )}
        {screen === 3 && (
          <ScrollView
            contentContainerStyle={[
              {
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{display: 'flex', alignItems: 'center', paddingBottom: 10, backgroundColor: colors.card, zIndex: -1, paddingTop: 10, width: '100%'}}>
              <Image source={require('./assets/img/logobig-zingo.png')} style={{width: 80, height: 80, resizeMode: 'contain'}} />
              <ZecAmount size={36} amtZec={totalBalance.total} style={{opacity: 0.4}} />
              <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Restore Wallet</RegText>
              <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>
            </View>

            <FadeText style={{marginTop: 20, textAlign: 'center'}}>Enter your seed phrase (24 words)</FadeText>
            <RegTextInput
              multiline
              style={{
                margin: 10,
                padding: 10,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: colors.text,
                maxWidth: '95%',
                minWidth: '95%',
                minheight: '20%',
                color: colors.text,
              }}
              value={seedPhrase}
              onChangeText={(text: string) => this.setState({ seedPhrase: text })}
            />
            <View style={{marginTop: 10}}>
              <FadeText style={{textAlign: 'center'}}>Wallet Birthday</FadeText>
            </View>
            <FadeText>Block height of first transaction. (OK to leave blank)</FadeText>
            <RegTextInput
              style={[
                {
                  margin: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.text,
                  width:'40%',
                  color: colors.text
                },
                cstyles.innerpaddingsmall,
              ]}
              value={birthday}
              keyboardType="numeric"
              onChangeText={(text: string) => this.setState({ birthday: text })}
            />
            <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20}}>
              <Button type="Primary" title="Restore Wallet" disabled={actionButtonsDisabled} onPress={this.doRestore} />
              <Button type="Secondary" title="Cancel" style={{marginLeft: 10}} onPress={() => this.setState({ screen: 1 })} />
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
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: 'rgba(24, 189, 24, 0.3)',
    text: '#c3c3c3',
    zingozcash: '#777777',
    placeholder: '#333333',
    money: '#ffffff'
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
