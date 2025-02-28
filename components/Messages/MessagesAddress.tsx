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
import { useMagicModal } from 'react-native-magic-modal';

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
  setPrivacyOption,
  setScrollToBottom,
  scrollToBottom,
  address,
  sendTransaction,
  setServerOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
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
          sendTransaction={sendTransaction}
          setServerOption={setServerOption}
          closeModal={hide}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default React.memo(MessagesAddress);
