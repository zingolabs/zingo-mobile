
import React, { useContext } from 'react';
//import MessageList from './components/MessageList';

import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
//import { useMagicModal } from 'react-native-magic-modal';
//import { useToast } from 'react-native-toastier';

type MessagesAllProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
};

const MessagesAll: React.FunctionComponent<MessagesAllProps> = ({
  //setPrivacyOption,
  //setScrollToBottom,
  //scrollToBottom,
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
      closeModal={() => {
        clear();
        hide();
      }}
    />
  );
  */
};

export default React.memo(MessagesAll);
