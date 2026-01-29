/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SnackbarDurationEnum, SnackbarType, ScreenEnum } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { useTheme } from '@react-navigation/native';
import { useToast } from 'react-native-toastier';

type SnackbarProps = {
  snackbars: SnackbarType[];
  removeFirstSnackbar: (s: ScreenEnum) => void;
  screenName: ScreenEnum;
};

const Snackbars: React.FunctionComponent<SnackbarProps> = ({ snackbars, removeFirstSnackbar, screenName }) => {
  const { colors } = useTheme()  as ThemeType;
  const snacking = useRef<boolean>(false);
  const snackingMessage = useRef<string>(undefined);
  const [duration, setDuration] = useState<number>(4000);
  const toast = useToast();
  const snackbarsFiltered = snackbars.filter((s: SnackbarType) => s.screenName.includes(screenName));

  const handleSnackbarClose = useCallback(() => {
    if (snackbarsFiltered[0]?.message !== snackingMessage.current) {
      return;
    }
    // we need some time between messages
    setTimeout(() => {
      //console.log('remove first snackbar', snackbarsFiltered[0]?.message, snackingMessage.current);
      snacking.current = false;
      snackingMessage.current = undefined;
      removeFirstSnackbar(screenName);
      setDuration(4000);
    }, 0);
  }, [removeFirstSnackbar, screenName, snackbarsFiltered]);

  // short  - 1 sec
  // long   - 4 sec
  // longer - 8 sec

  useEffect(() => {
    if (snackbarsFiltered.length > 0 && !snacking.current) {
      const currentSnackbar = snackbarsFiltered[0];
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
        right: ((
          <Pressable
            onPress={() => toast.clear()}
            style={{ padding: 10 }}
          >
            <Text style={{ fontSize: 18 }}>✕</Text>
          </Pressable>
        )),
        textContainerStyle: {
          padding: 0,
          margin: 0,
          paddingVertical: 10,
        },
        messageStyle: {
          color: colors.background,
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
          backgroundColor: colors.zingo,
          marginBottom: 100,
          padding: 0,
          paddingLeft: 20,
          paddingRight: 15,
        },
      });
    }
  }, [
    colors.background,
    colors.zingo,
    snackbarsFiltered,
    snackbarsFiltered.length,
    duration,
    toast,
  ]);

  useEffect(() => {
    if (snackbarsFiltered.length > 0 && snacking.current) {
      // we do not know if the message was properly shown
      // closing after duration, just in case.
      const timer = setTimeout(() => {
        handleSnackbarClose();
      }, duration + 500);
      return () => clearTimeout(timer);
    }
  }, [duration, handleSnackbarClose, snackbarsFiltered, snackbarsFiltered.length]);

  useEffect(() => {
    //console.log('MOUNTING - snackbar');
    return () => {
      setTimeout(() => {
        //console.log('CLOSING - waiting for some message');
      }, 2 * 1000);
    };
  }, [toast]);

  //console.log('snackbars', screenName, snackbarsFiltered);

  return <View />;
};

export default Snackbars;
