/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { SelectServerEnum, SendPageStateClass, ServerType } from '../../app/AppState';
import MessageList from './components/MessageList';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

type MessagesAddressProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address: string;
  closeModal: () => void;
  openModal: () => void;
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

const MessagesAddress: React.FunctionComponent<MessagesAddressProps> = ({
  setPrivacyOption,
  setScrollToBottom,
  scrollToBottom,
  address,
  closeModal,
  openModal,
  sendTransaction,
  setServerOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          height: '100%',
          backgroundColor: colors.background,
        }}>
        <MessageList
          setPrivacyOption={setPrivacyOption}
          setScrollToBottom={setScrollToBottom}
          scrollToBottom={scrollToBottom}
          address={address}
          closeModal={closeModal}
          openModal={openModal}
          sendTransaction={sendTransaction}
          setServerOption={setServerOption}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default React.memo(MessagesAddress);
