
import React from 'react';
import { RouteEnum } from '../../app/AppState';
//import MessageList from './components/MessageList';

import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../../app/types';

//import { useToast } from 'react-native-toastier';

type MessagesAllProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.MessagesAll>;

const MessagesAll: React.FunctionComponent<MessagesAllProps> = ({
  //navigation,
  //route,
}) => {
  //const setScrollToBottom = route.params.setScrollToBottom;
  //const scrollToBottom = route.params.scrollToBottom;
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
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
    />
  );
  */
};

export default React.memo(MessagesAll);
