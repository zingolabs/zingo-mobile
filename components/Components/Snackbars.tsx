import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View } from 'react-native';
import { SnackbarDurationEnum, TranslateType, SnackbarType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { useTheme } from '@react-navigation/native';
import { useToast } from 'react-native-toastier';

type SnackbarProps = {
  snackbars: SnackbarType[];
  removeFirstSnackbar: () => void;
  translate: (key: string) => TranslateType;
  screenName?: string;
};

const Snackbars: React.FunctionComponent<SnackbarProps> = ({ snackbars, removeFirstSnackbar, translate, screenName }) => {
  const { colors } = useTheme()  as ThemeType;
  //const [snacking, setSnacking] = useState<boolean>(false);
  const snacking = useRef<boolean>(false);
  const snackingMessage = useRef<string>(undefined);
  const [duration, setDuration] = useState<number>(4000);
  const toast = useToast();

  const handleSnackbarClose = useCallback(() => {
    if (snackbars[0]?.message !== snackingMessage.current) {
      return;
    }
    if (snackbars[0]?.screenName !== screenName) {
        return;
      }
    // we need some time between messages
    setTimeout(() => {
      //console.log('remove first snackbar', snackbars[0]?.message, snackingMessage.current);
      snacking.current = false;
      snackingMessage.current = undefined;
      removeFirstSnackbar();
      setDuration(4000);
    }, 0);
  }, [removeFirstSnackbar, screenName, snackbars]);

  // short  - 1 sec
  // long   - 4 sec
  // longer - 8 sec

  useEffect(() => {
    if (snackbars.length > 0 && !snacking.current) {
      const currentSnackbar = snackbars[0];
      if (currentSnackbar.screenName !== screenName) {
        return;
      }
      snacking.current = true;
      snackingMessage.current = currentSnackbar.message;
      setDuration(
        currentSnackbar.duration === SnackbarDurationEnum.longer
          ? 8000
          : currentSnackbar.duration === SnackbarDurationEnum.short
          ? 1000
          : 4000,
      );
      //console.log('show snackbar', currentSnackbar);
      toast.show({
        message: currentSnackbar.message,
        animation: 'zoomIn',
        duration,
        textContainerStyle: {
          padding: 0,
          margin: 0,
          paddingVertical: 10,
        },
        messageStyle: {
          color: colors.money,
          fontSize: 15,
          padding: 0,
          margin: 0,
        },
        titleStyle: {
          fontSize: 15,
          fontWeight: 'normal',
          padding: 0,
          margin: 0,
        },
        contentContainerStyle: {
          flex: 0.999,
          backgroundColor: colors.secondaryDisabled,
          marginBottom: 100,
          padding: 0,
          paddingLeft: 20,
          paddingRight: 5,
        },
      });
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
    toast,
    screenName,
  ]);

  useEffect(() => {
    if (snackbars.length > 0 && snacking.current) {
      // we do not know if the message was properly shown
      // closing after duration, just in case.
      const timer = setTimeout(() => {
        handleSnackbarClose();
      }, duration + 500);
      return () => clearTimeout(timer);
    }
  }, [duration, handleSnackbarClose, snackbars, snackbars.length]);

  useEffect(() => {
    //console.log('MOUNTING - snackbar');
    return () => {
      setTimeout(() => {
        //console.log('CLOSING - waiting for some message');
      }, 2 * 1000);
    };
  }, [toast]);

  //console.log('snackbars', snackbars, duration, snacking);

  return <View />;
};

export default Snackbars;
