import React from 'react';
import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import ContactList from './components/ContactList';

type MessagesProps = {
  // side menu
  toggleMenuDrawer: () => void;
  // balance
  // syncing
  syncingStatusMoreInfoOnClick: () => void;
  // privacy
  setPrivacyOption: (value: boolean) => Promise<void>;
  // addLastSnackbar from context
  // shielding / sending
  setScrollToTop: (value: boolean) => void;
  scrollToTop: boolean;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  // read-only wallet
  setUfvkViewModalVisible?: (v: boolean) => void;
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
  syncingStatusMoreInfoOnClick,
  setPrivacyOption,
  setUfvkViewModalVisible,
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
      syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
      setPrivacyOption={setPrivacyOption}
      setUfvkViewModalVisible={setUfvkViewModalVisible}
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
