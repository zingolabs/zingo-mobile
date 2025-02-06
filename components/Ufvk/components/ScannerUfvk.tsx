/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ContextAppLoading } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';
import Scanner from '../../Components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import Header from '../../Header';
import { SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';

type ScannerKeyProps = {
  setUfvkText: (k: string) => void;
  closeModal: () => void;
};
const ScannerKey: React.FunctionComponent<ScannerKeyProps> = ({ setUfvkText, closeModal }) => {
  const context = useContext(ContextAppLoading);
  const { translate, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const onRead = async (e: BarCodeReadEvent) => {
    const scandata = e.data.trim();

    setUfvkText(scandata);
    closeModal();
  };

  const doCancel = () => {
    closeModal();
  };

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('scanner.text') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        closeScreen={doCancel}
      />
      <Scanner onRead={onRead} />
    </SafeAreaView>
  );
};

export default ScannerKey;
