/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React, {Component} from 'react';
import {View, Alert, TouchableOpacity, Clipboard} from 'react-native';

import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {AppearanceProvider} from 'react-native-appearance';
import {createStackNavigator} from '@react-navigation/stack';
import {getStatusBarHeight} from 'react-native-status-bar-height';
import Toast from 'react-native-simple-toast';

import cstyles from './components/CommonStyles';
import {PrimaryButton, BoldText, RegText, RegTextInput} from './components/Components';
import RPCModule from './components/RPCModule';
import LoadedApp from './app/LoadedApp';

// -----------------
// Loading View
// -----------------
type LoadingProps = {
  navigation: any;
};

type LoadingState = {
  screen: number;
  walletExists: boolean;
  seedPhrase: string | null;
  birthday: string;
};

class LoadingView extends Component<LoadingProps, LoadingState> {
  constructor(props: Readonly<LoadingProps>) {
    super(props);

    this.state = {
      screen: 0,
      walletExists: false,
      seedPhrase: null,
      birthday: '0',
    };
  }

  componentDidMount = async () => {
    // First, check if a wallet exists
    const exists = await RPCModule.walletExists();
    console.log('Exists result', exists);

    if (exists && exists !== 'false') {
      this.setState({walletExists: true});
      const error = await RPCModule.loadExistingWallet();
      if (!error.startsWith('Error')) {
        // Load the wallet and navigate to the transactions screen
        this.navigateToLoaded();
      } else {
        Alert.alert('Error Reading Wallet', error);
      }
    } else {
      console.log('Loading new wallet');
      // And after 1.5s, go to the wallet screen
      setTimeout(() => this.setState({screen: 1, walletExists: false}), 1500);
    }
  };

  navigateToLoaded = () => {
    const {navigation} = this.props;
    navigation.reset({
      index: 0,
      routes: [{name: 'LoadedApp'}],
    });
  };

  render() {
    const {screen, birthday, seedPhrase} = this.state;

    const createNewWallet = async () => {
      const seed = await RPCModule.createNewWallet();
      if (!seed.startsWith('Error')) {
        this.setState({seedPhrase: seed, screen: 2});
      } else {
        Alert.alert('Error creating Wallet', seed);
      }
    };

    const getSeedPhraseToRestore = async () => {
      this.setState({seedPhrase: '', birthday: '0', screen: 3});
    };

    const doRestore = async () => {
      // Don't call with null values
      if (!seedPhrase) {
        Alert.alert('Invalid Seed Phrase', 'The seed phrase was invalid');
        return;
      }

      const error = await RPCModule.restoreWallet(seedPhrase, birthday || '0');
      if (!error.startsWith('Error')) {
        this.navigateToLoaded();
      } else {
        Alert.alert('Error reading Wallet', error);
      }
    };

    const loadWallet = () => {
      this.navigateToLoaded();
    };

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
        <BoldText>Zecwallet Lite Mobile</BoldText>
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
            <PrimaryButton title="Create New Wallet" onPress={createNewWallet} />
            <View style={[cstyles.margintop]}>
              <PrimaryButton title="Restore seed" onPress={getSeedPhraseToRestore} />
            </View>
          </View>
        )}
        {screen === 2 && seedPhrase && (
          <View
            style={[
              {
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}>
            <BoldText style={cstyles.center}>
              This is your seed phrase. Please write it down carefully. It is the only way to restore your wallet.
            </BoldText>
            <TouchableOpacity
              style={[cstyles.margintop, {padding: 10, backgroundColor: '#212124'}]}
              onPress={() => {
                const seed = JSON.parse(seedPhrase).seed;
                if (seed) {
                  Clipboard.setString(seed);
                  Toast.show('Copied Seed to Clipboard', Toast.LONG);
                }
              }}>
              <RegText>{JSON.parse(seedPhrase).seed}</RegText>
            </TouchableOpacity>
            <View style={[cstyles.margintop]}>
              <RegText style="">Birthday: </RegText>
            </View>
            <RegText style="">{JSON.parse(seedPhrase).birthday}</RegText>
            <View style={[cstyles.margintop]}>
              <PrimaryButton title="I have saved the seed" onPress={loadWallet} />
            </View>
          </View>
        )}
        {screen === 3 && (
          <View
            style={[
              {
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}>
            <RegText style={[cstyles.marginbottomsmall]}>Enter your seed phrase (24 words)</RegText>
            <RegTextInput
              multiline
              style={[
                {
                  color: 'red',
                  maxWidth: '100%',
                  minWidth: '100%',
                  borderColor: 'gray',
                  borderWidth: 1,
                },
                cstyles.innerpaddingsmall,
              ]}
              value={seedPhrase}
              onChangeText={(text: string) => this.setState({seedPhrase: text})}
            />
            <RegText style={[cstyles.margintop, cstyles.center, cstyles.marginbottomsmall]}>
              Wallet Birthday (Block height of first transaction). (OK to leave blank)
            </RegText>
            <RegTextInput
              style={[
                {
                  maxWidth: '50%',
                  minWidth: '50%',
                  borderColor: 'gray',
                  borderWidth: 1,
                },
                cstyles.innerpaddingsmall,
              ]}
              value={birthday}
              keyboardType="numeric"
              onChangeText={(text: string) => this.setState({birthday: text})}
            />
            <View style={cstyles.margintop}>
              <PrimaryButton title="Restore Wallet" onPress={doRestore} />
            </View>
          </View>
        )}
      </View>
    );
  }
}

const ZecwalletTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#212124',
    card: '#353535',
    primary: '#c3921f',
    text: '#FFFFFF',
  },
};

const Stack = createStackNavigator();
export default function App() {
  return (
    <AppearanceProvider>
      <NavigationContainer theme={ZecwalletTheme}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingTop: getStatusBarHeight(),
          }}>
          <Stack.Navigator headerMode="none">
            <Stack.Screen name="LoadingView" component={LoadingView} />
            <Stack.Screen name="LoadedApp" component={LoadedApp} />
          </Stack.Navigator>
        </View>
      </NavigationContainer>
    </AppearanceProvider>
  );
}
