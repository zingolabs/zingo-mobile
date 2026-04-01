import React, { useContext } from 'react';

import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { HeaderTitle } from '../Header';

type FaucetProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Faucet>;

const Faucet: React.FunctionComponent<FaucetProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar } = context;
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Faucet"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
    </ToastProvider>
  );
};

export default Faucet;
