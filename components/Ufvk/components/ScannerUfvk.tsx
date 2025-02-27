/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ContextAppLoading } from '../../../app/context';
import Scanner from '../../Components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import Header from '../../Header';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';
import { Code } from 'react-native-vision-camera';
import { useMagicModal } from 'react-native-magic-modal';

type ScannerKeyProps = {
  setUfvkText: (k: string) => void;
};
const ScannerKey: React.FunctionComponent<ScannerKeyProps> = ({ setUfvkText }) => {
  const context = useContext(ContextAppLoading);
  const { translate, language } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  moment.locale(language);

  const onRead = async (codes: Code[]) => {
    const scandata = codes[0].value?.trim();

    if (!scandata) {
      return;
    }

    setUfvkText(scandata);
    hide();
  };

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
        <Header
          title={translate('scanner.text') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={hide}
        />
        <Scanner onRead={onRead} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ScannerKey;
