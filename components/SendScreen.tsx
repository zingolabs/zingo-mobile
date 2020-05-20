/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {RegText} from '../components/Components';
import {Info} from 'app/AppState';

type SendScreenProps = {
  info: Info | null;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({}) => {
  return <RegText>Send</RegText>;
};

export default SendScreen;
