
import React, { useContext } from 'react';
import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
//import MessageList from './components/MessageList';

import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
//import { useMagicModal } from 'react-native-magic-modal';
//import { useToast } from 'react-native-toastier';

type MessagesAddressProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address: string;
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

const MessagesAddress: React.FunctionComponent<MessagesAddressProps> = ({
  //setPrivacyOption,
  //setScrollToBottom,
  //scrollToBottom,
  //address,
  //sendTransaction,
  //setServerOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  //const { hide } = useMagicModal();
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
        hide();
      }}
    />
  );
  */
};

export default React.memo(MessagesAddress);
