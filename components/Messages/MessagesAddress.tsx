/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ButtonTypeEnum, SendPageStateClass } from '../../app/AppState';
import MessageList from './components/MessageList';
import { SafeAreaView, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import Button from '../Components/Button';

type MessagesAddressProps = {
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
  address: string;
  closeModal: () => void;
};

const MessagesAddress: React.FunctionComponent<MessagesAddressProps> = ({
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
  address,
  closeModal,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language } = context;
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
        address={address}
      />
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10 }}>
        <Button type={ButtonTypeEnum.Secondary} title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default React.memo(MessagesAddress);
