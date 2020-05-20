/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {RegText} from '../components/Components';
import {Info} from 'app/AppState';

type ReceiveScreenProps = {
  info: Info | null;
};

const ReceiveScreen: React.FunctionComponent<ReceiveScreenProps> = ({}) => {
  return <RegText>Receive</RegText>;
};

export default ReceiveScreen;
