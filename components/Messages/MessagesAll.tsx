/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import MessageList from './components/MessageList';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContextAppLoaded } from '../../app/context';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import moment from 'moment';

type MessagesAllProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  closeModal: () => void;
  openModal: () => void;
};

const MessagesAll: React.FunctionComponent<MessagesAllProps> = ({
  setPrivacyOption,
  setScrollToBottom,
  scrollToBottom,
  closeModal,
  openModal,
}) => {
  const context = useContext(ContextAppLoaded);
  const { language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  return (
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
        closeModal={closeModal}
        openModal={openModal}
      />
    </SafeAreaView>
  );
};

export default React.memo(MessagesAll);
