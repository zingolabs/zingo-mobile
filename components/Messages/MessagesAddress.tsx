import React from 'react';
//import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import { RouteEnum } from '../../app/AppState';
//import MessageList from './components/MessageList';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../../app/types';

type MessagesAddressProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MessagesAddress
>;

const MessagesAddress: React.FunctionComponent<MessagesAddressProps> = (
  {
    //navigation,
    //route,
  },
) => {
  //const setScrollToBottom = route.params.setScrollToBottom;
  //const scrollToBottom = route.params.scrollToBottom;
  //const address = route.params.address;
  //const sendTransaction = route.params.sendTransaction;
  //const setServerOption = route.params.setServerOption;

  return null;

  /*
  return (
    <MessageList
      setPrivacyOption={setPrivacyOption}
      setScrollToBottom={setScrollToBottom}
      scrollToBottom={scrollToBottom}
      address={address}
      sendTransaction={sendTransaction}
      setServerOption={setServerOption}
      closeModal={() => {
        clear();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
    />
  );
  */
};

export default React.memo(MessagesAddress);
