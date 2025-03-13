import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Platform, View } from 'react-native';
import Snackbar from 'react-native-snackbar';
import { GlobalConst, SnackbarType } from '../../app/AppState';
import { SnackbarDurationEnum, TranslateType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { useTheme } from '@react-navigation/native';
import { ToastService } from 'react-native-toastier';

type SnackbarProps = {
  snackbars: SnackbarType[];
  removeFirstSnackbar: () => void;
  translate: (key: string) => TranslateType;
};

const Snackbars: React.FunctionComponent<SnackbarProps> = ({ snackbars, removeFirstSnackbar, translate }) => {
  const { colors } = useTheme()  as ThemeType;
  //const [snacking, setSnacking] = useState<boolean>(false);
  const snacking = useRef<boolean>(false);
  const snackingMessage = useRef<string>(undefined);
  const [duration, setDuration] = useState<number>(4000);

  const handleSnackbarClose = useCallback(() => {
    if (snackbars[0]?.message !== snackingMessage.current) {
      return;
    }
    if (Platform.OS === GlobalConst.platformOSandroid) {
      Snackbar.dismiss();
    }
    // we need some time between messages
    setTimeout(() => {
      console.log('remove first snackbar', snackbars[0]?.message, snackingMessage.current);
      snacking.current = false;
      snackingMessage.current = undefined;
      removeFirstSnackbar();
      setDuration(4000);
    }, 0);
  }, [removeFirstSnackbar, snackbars]);

  // short  - 1 sec
  // long   - 4 sec
  // longer - 8 sec

  useEffect(() => {
    if (snackbars.length > 0 && !snacking.current) {
      const currentSnackbar = snackbars[0];
      snacking.current = true;
      snackingMessage.current = currentSnackbar.message;
      setDuration(
        currentSnackbar.duration === SnackbarDurationEnum.longer
          ? 8000
          : currentSnackbar.duration === SnackbarDurationEnum.short
          ? 1000
          : 4000,
      );
      if (Platform.OS === GlobalConst.platformOSios) {
        console.log('show snackbar', currentSnackbar);
        ToastService.show({
          message: currentSnackbar.message,
          messageStyle: { color: colors.money },
          contentContainerStyle: { flex: 0.95, backgroundColor: colors.secondaryDisabled, marginBottom: 50 },
          animation: 'zoomIn',
          duration,
        });
      } else {
        Snackbar.show({
          text: currentSnackbar.message,
          numberOfLines: 3,
          duration: Snackbar.LENGTH_INDEFINITE,
          marginBottom: 120,
          backgroundColor: colors.secondaryDisabled,
          textColor: colors.money,
          action: {
            text: translate('close') as string,
            textColor: colors.primary,
            onPress: () => handleSnackbarClose(),
          },
        });
      }
    }
  }, [
    colors.money,
    colors.primary,
    colors.secondaryDisabled,
    handleSnackbarClose,
    snackbars,
    snackbars.length,
    translate,
    duration,
  ]);

  useEffect(() => {
    if (snackbars.length > 0 && snacking.current) {
      // we do not know if the message was properly shown
      // closing after duration, just in case.
      const timer = setTimeout(() => {
        handleSnackbarClose();
      }, Platform.OS === GlobalConst.platformOSandroid ? duration : duration + 500);
      return () => clearTimeout(timer);
    }
  }, [duration, handleSnackbarClose, snackbars, snackbars.length]);

  useEffect(() => {
    return () => {
      setTimeout(() => {
        if (Platform.OS === GlobalConst.platformOSandroid) {
          Snackbar.dismiss();
        }
      }, 2000);
    };
  }, []);

  console.log('snackbars', snackbars, duration, snacking);

  return <View />;
};

export default Snackbars;
