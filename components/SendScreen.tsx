/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView} from 'react-native';
import {FadeText, RegTextInput, PrimaryButton} from '../components/Components';
import {Info, SendPageState} from '../app/AppState';
import {faQrcode, faUpload} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useTheme} from '@react-navigation/native';

type SendScreenProps = {
  info: Info | null;
  sendPageState: SendPageState;
  setSendPageState: (sendPageState: SendPageState) => void;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({sendPageState, setSendPageState}) => {
  const {colors} = useTheme();

  const updateToField = (address: string | null, amount: string | null, memo: string | null) => {
    const newToAddrs = sendPageState.toaddrs.slice(0);
    // Find the correct toAddr
    const toAddr = newToAddrs[0];
    if (!toAddr) {
      return;
    }

    if (address !== null) {
      toAddr.to = address.replace(/ /g, ''); // Remove spaces
    }

    if (amount !== null) {
      // Check to see the new amount if valid
      // $FlowFixMe
      const newAmount = parseFloat(amount);
      if (newAmount < 0 || newAmount > 21 * 10 ** 6) {
        return;
      }
      toAddr.amount = newAmount;
    }

    if (memo !== null) {
      toAddr.memo = memo;
    }

    // Create the new state object
    const newState = new SendPageState();
    newState.fromaddr = sendPageState.fromaddr;
    newState.toaddrs = newToAddrs;

    setSendPageState(newState);
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
      <FadeText>To</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].to}
          onChangeText={(text: string) => updateToField(text, null, null)}
        />
        <FontAwesomeIcon style={{margin: 5}} size={24} icon={faQrcode} color={colors.text} />
      </View>

      <FadeText style={{marginTop: 20}}>Amount</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          placeholder="0.0"
          placeholderTextColor="#777777"
          keyboardType="numeric"
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].amount.toString()}
          onChangeText={(text: string) => updateToField(null, text, null)}
        />
        <FontAwesomeIcon style={{margin: 5}} size={24} icon={faUpload} color={colors.text} />
      </View>

      <FadeText style={{marginTop: 20}}>Memo</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          multiline
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].memo}
          onChangeText={(text: string) => updateToField(null, null, text)}
        />
      </View>

      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 20}}>
        <PrimaryButton title="Send" />
      </View>
    </ScrollView>
  );
};

export default SendScreen;
