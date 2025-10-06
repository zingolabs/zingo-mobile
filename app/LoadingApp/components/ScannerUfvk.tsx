/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ContextAppLoading } from '../../context';
import Scanner from '../../../components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import Header from '../../../components/Header';

import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../types';
import { View } from 'react-native';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { ScreenEnum } from '../../AppState';

type ScannerUfvkProps = {
  setUfvkText: (k: string) => void;
  closeModal: () => void;
};
const ScannerUfvk: React.FunctionComponent<ScannerUfvkProps> = ({ setUfvkText, closeModal }) => {
  const context = useContext(ContextAppLoading);
  const { translate, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);
  const screenName = ScreenEnum.ScannerUfvk;

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    setUfvkText(scandata);
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('scanner.text') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={closeModal}
        />
        <Scanner onRead={onRead} onClose={() => closeModal()} active={true} />
      </View>
    </ToastProvider>
  );
};

export default ScannerUfvk;
