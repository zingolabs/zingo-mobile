
import React, { useContext } from 'react';
//import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import { RouteEnum } from '../../app/AppState';
//import MessageList from './components/MessageList';

import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../../app/types';
//import { useToast } from 'react-native-toastier';

type MessagesAddressProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.MessagesAddress>;

const MessagesAddress: React.FunctionComponent<MessagesAddressProps> = ({
  //navigation,
  //route,
}) => {
  //const setScrollToBottom = route.params.setScrollToBottom;
  //const scrollToBottom = route.params.scrollToBottom;
  //const address = route.params.address;
  //const sendTransaction = route.params.sendTransaction;
  //const setServerOption = route.params.setServerOption;
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  moment.locale(language);
  //const { clear } = useToast();

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
