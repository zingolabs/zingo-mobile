
import React, { useContext } from 'react';
import MessageList from './components/MessageList';

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
    <MessageList
      setPrivacyOption={setPrivacyOption}
      setScrollToBottom={setScrollToBottom}
      scrollToBottom={scrollToBottom}
      closeModal={hide}
    />
  );
};

export default React.memo(MessagesAll);
