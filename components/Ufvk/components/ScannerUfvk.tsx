/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ContextAppLoading } from '../../../app/context';
import Scanner from '../../Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import Header from '../../Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';
import { View } from 'react-native';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';

type ScannerUfvkProps = {
  setUfvkText: (k: string) => void;
  closeModal: () => void;
};
const ScannerUfvk: React.FunctionComponent<ScannerUfvkProps> = ({ setUfvkText, closeModal }) => {
  const context = useContext(ContextAppLoading);
  const { translate, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);

  const onRead = async (value: string) => {
    const scandata = value;

    if (!scandata) {
      return;
    }

    setUfvkText(scandata);
    closeModal();
  };

  return (
    <ToastProvider>
      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          translate={translate}
        />

        <Header
          title={translate('scanner.text') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={closeModal}
        />
        <Scanner onRead={onRead} />
      </View>
    </ToastProvider>
  );
};

export default ScannerUfvk;
