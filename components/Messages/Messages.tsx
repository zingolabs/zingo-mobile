import React from 'react';
import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import ContactList from './components/ContactList';

type MessagesProps = {
  // side menu
  toggleMenuDrawer: () => void;
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

const Messages: React.FunctionComponent<MessagesProps> = ({
  toggleMenuDrawer,
  setPrivacyOption,
  setScrollToTop,
  scrollToTop,
  setScrollToBottom,
  scrollToBottom,
  sendTransaction,
  setServerOption,
}) => {
  return (
    <ContactList
      toggleMenuDrawer={toggleMenuDrawer}
      setPrivacyOption={setPrivacyOption}
      setScrollToTop={setScrollToTop}
      scrollToTop={scrollToTop}
      setScrollToBottom={setScrollToBottom}
      scrollToBottom={scrollToBottom}
      sendTransaction={sendTransaction}
      setServerOption={setServerOption}
    />
  );
};

export default React.memo(Messages);
