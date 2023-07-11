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

  const handleSnackbarClose = useCallback(() => {
    console.log('remove first snackbar');
    Snackbar.dismiss();
    removeFirstSnackbar();
    setSnacking(false);
  }, [removeFirstSnackbar]);

  useEffect(() => {
    if (snackbars.length > 0 && !snacking) {
      const currentSnackbar = snackbars[0];
      console.log('show snackbar', currentSnackbar);
      setSnacking(true);
      Snackbar.show({
        text: currentSnackbar.message,
        duration: Snackbar.LENGTH_INDEFINITE,
        marginBottom: 60,
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
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [handleSnackbarClose, snackbars, snackbars.length]);

  console.log('snackbars', snackbars);

  return <View />;
};

export default Snackbars;
