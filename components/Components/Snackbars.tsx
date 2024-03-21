import React, { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import Snackbar from 'react-native-snackbar';
import SnackbarType from '../../app/AppState/types/SnackbarType';
import { TranslateType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { useTheme } from '@react-navigation/native';

type SnackbarProps = {
  snackbars: SnackbarType[];
  removeFirstSnackbar: () => void;
  translate: (key: string) => TranslateType;
};

const Snackbars: React.FunctionComponent<SnackbarProps> = ({ snackbars, removeFirstSnackbar, translate }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [snacking, setSnacking] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(4000);

  const handleSnackbarClose = useCallback(() => {
    //console.log('remove first snackbar');
    Snackbar.dismiss();
    removeFirstSnackbar();
    setDuration(4000);
    setSnacking(false);
  }, [removeFirstSnackbar]);

  // short  - 1 sec
  // long   - 4 sec
  // longer - 8 sec

  useEffect(() => {
    if (snackbars.length > 0 && !snacking) {
      const currentSnackbar = snackbars[0];
      //console.log('show snackbar', currentSnackbar);
      setDuration(currentSnackbar.duration === 'short' ? 1000 : currentSnackbar.duration === 'long' ? 4000 : 8000);
      setSnacking(true);
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
  }, [
    colors.money,
    colors.primary,
    colors.secondaryDisabled,
    handleSnackbarClose,
    snackbars,
    snackbars.length,
    snacking,
    translate,
  ]);

  useEffect(() => {
    if (snackbars.length > 0) {
      const timer = setTimeout(() => {
        handleSnackbarClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleSnackbarClose, snackbars, snackbars.length]);

  //console.log('snackbars', snackbars);

  return <View />;
};

export default Snackbars;
