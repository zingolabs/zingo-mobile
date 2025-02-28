import React, { useContext } from 'react';
import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import ContactList from './components/ContactList';
import moment from 'moment';
import { ContextAppLoaded } from '../../app/context';
import { useMagicModal } from 'react-native-magic-modal';

type MessagesModalProps = {
  // side menu
  // balance
  // privacy
  setPrivacyOption: (value: boolean) => Promise<void>;
  // addLastSnackbar from context
  // shielding / sending
  setScrollToTop: (value: boolean) => void;
  scrollToTop: boolean;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  // for messages
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

const MessagesModal: React.FunctionComponent<MessagesModalProps> = ({
  setPrivacyOption,
  setScrollToTop,
  scrollToTop,
  setScrollToBottom,
  scrollToBottom,
  sendTransaction,
  setServerOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  const { hide } = useMagicModal();
  moment.locale(language);

  return (
    <ContactList
      setPrivacyOption={setPrivacyOption}
      setScrollToTop={setScrollToTop}
      scrollToTop={scrollToTop}
      setScrollToBottom={setScrollToBottom}
      scrollToBottom={scrollToBottom}
      sendTransaction={sendTransaction}
      setServerOption={setServerOption}
      closeModal={hide}
      noDrawMenu={true}
    />
  );
};

export default React.memo(MessagesModal);
