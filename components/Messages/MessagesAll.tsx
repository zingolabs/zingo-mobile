/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import MessageList from './components/MessageList';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ContextAppLoaded } from '../../app/context';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import moment from 'moment';
import { useMagicModal } from 'react-native-magic-modal';

type MessagesAllProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
};

const MessagesAll: React.FunctionComponent<MessagesAllProps> = ({
  setPrivacyOption,
  setScrollToBottom,
  scrollToBottom,
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
          closeModal={hide}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default React.memo(MessagesAll);
