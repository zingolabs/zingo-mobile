import React from 'react';
import { SendPageStateClass } from '../../app/AppState';
import MessageList from './components/MessageList';

type MessagesProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  poolsMoreInfoOnClick: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
  setComputingModalVisible: (visible: boolean) => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  setShieldingAmount: (value: number) => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
};

const Messages: React.FunctionComponent<MessagesProps> = ({
  doRefresh,
  toggleMenuDrawer,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
  setComputingModalVisible,
  setPrivacyOption,
  setUfvkViewModalVisible,
  setSendPageState,
  setShieldingAmount,
  setScrollToBottom,
  scrollToBottom,
}) => {
  return (
    <MessageList
      doRefresh={doRefresh}
      toggleMenuDrawer={toggleMenuDrawer}
      syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
      poolsMoreInfoOnClick={poolsMoreInfoOnClick}
      setZecPrice={setZecPrice}
      setComputingModalVisible={setComputingModalVisible}
      setPrivacyOption={setPrivacyOption}
      setUfvkViewModalVisible={setUfvkViewModalVisible}
      setSendPageState={setSendPageState}
      setShieldingAmount={setShieldingAmount}
      setScrollToBottom={setScrollToBottom}
      scrollToBottom={scrollToBottom}
    />
  );
};

export default React.memo(Messages);
