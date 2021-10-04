/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React, {Component} from 'react';
import {View, ScrollView, Alert, SafeAreaView, Image, Text} from 'react-native';

import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {AppearanceProvider} from 'react-native-appearance';
import {createStackNavigator} from '@react-navigation/stack';

import cstyles from './components/CommonStyles';
import {PrimaryButton, SecondaryButton, BoldText, RegText, RegTextInput, FadeText} from './components/Components';
import RPCModule from './components/RPCModule';
import LoadedApp from './app/LoadedApp';
import SeedComponent from './components/SeedComponent';

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

class LoadingView extends Component<LoadingProps, LoadingState> {
  constructor(props: Readonly<LoadingProps>) {
    super(props);

    this.state = {
      screen: 0,
      actionButtonsDisabled: false,
      walletExists: false,
      seedPhrase: null,
      birthday: '0',
    };
  }

  componentDidMount = async () => {
    // First, check if a wallet exists. Do it async so the basic screen has time to render
    setTimeout(async () => {
      const exists = await RPCModule.walletExists();
      // console.log('Exists result', exists);

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
        // console.log('Loading new wallet');
        this.setState({screen: 1, walletExists: false});
      }
    });
  };

  navigateToLoaded = () => {
    const {navigation} = this.props;
    navigation.reset({
      index: 0,
      routes: [{name: 'LoadedApp'}],
    });
  };

  createNewWallet = () => {
    this.setState({actionButtonsDisabled: true});

    setTimeout(async () => {
      const seed = await RPCModule.createNewWallet();
      if (!seed.startsWith('Error')) {
        this.setState({seedPhrase: seed, screen: 2});
      } else {
        this.setState({actionButtonsDisabled: false});
        Alert.alert('Error creating Wallet', seed);
      }
    });
  };

  getSeedPhraseToRestore = async () => {
    this.setState({seedPhrase: '', birthday: '0', screen: 3});
  };

  doRestore = async () => {
    // Don't call with null values
    const {birthday, seedPhrase} = this.state;

    if (!seedPhrase) {
      Alert.alert('Invalid Seed Phrase', 'The seed phrase was invalid');
      return;
    }

    this.setState({actionButtonsDisabled: true});
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
        this.setState({actionButtonsDisabled: false});
        Alert.alert('Error reading Wallet', error);
      }
    });
  };

  loadWallet = () => {
    this.navigateToLoaded();
  };

  render() {
    const {screen, birthday, seedPhrase, actionButtonsDisabled} = this.state;

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
        {screen === 0 && <Text style={{color: '#FFFFFF', fontSize: 36, fontWeight: 'bold'}}>Zecwallet Lite</Text>}
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
            <View style={{marginBottom: 50, display: 'flex', alignItems: 'center'}}>
              <Image
                source={require('./assets/img/logobig.png')}
                style={{width: 100, height: 100, resizeMode: 'contain'}}
              />
              <BoldText>Zecwallet Lite</BoldText>
            </View>

            <PrimaryButton title="Create New Wallet" disabled={actionButtonsDisabled} onPress={this.createNewWallet} />
            <View style={[cstyles.margintop]}>
              <SecondaryButton title="Restore Seed" onPress={this.getSeedPhraseToRestore} />
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
            <RegText style={{margin: 30}}>Enter your seed phrase (24 words)</RegText>
            <RegTextInput
              multiline
              style={[
                {
                  maxWidth: '95%',
                  minWidth: '95%',
                  borderColor: 'gray',
                  borderWidth: 1,
                  minHeight: 100,
                },
                cstyles.innerpaddingsmall,
              ]}
              value={seedPhrase}
              onChangeText={(text: string) => this.setState({seedPhrase: text})}
            />
            <RegText style={[cstyles.margintop, cstyles.center]}>Wallet Birthday</RegText>
            <FadeText>Block height of first transaction. (OK to leave blank)</FadeText>
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
              <PrimaryButton title="Restore Wallet" disabled={actionButtonsDisabled} onPress={this.doRestore} />
            </View>
          </ScrollView>
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
    border: '#454545',
    primary: '#c3921f',
    text: '#FFFFFF',
  },
};

const Stack = createStackNavigator();
export default function App() {
  return (
    <AppearanceProvider>
      <NavigationContainer theme={ZecwalletTheme}>
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: ZecwalletTheme.colors.card,
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
