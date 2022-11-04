/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { SendProgress } from '../../AppState';
import RegText from '../../../components/Components/RegText';
import { ThemeType } from '../../types';
import CircularProgress from '../../../components/CircularProgress';

type ComputingTxContentProps = {
  progress: SendProgress;
};

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({ progress }) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <RegText>Computing Transaction</RegText>
      {!(progress && progress.sendInProgress) && <RegText>Please wait...</RegText>}
      {progress && progress.sendInProgress && (
        <>
          <RegText>{`Step ${progress.progress} of ${progress.total}`}</RegText>
          <RegText style={{ marginBottom: 20 }}>{`ETA ${progress.etaSeconds}s`}</RegText>
          <CircularProgress
            size={100}
            strokeWidth={5}
            textSize={20}
            text={(((progress.progress + 1) * 100) / 4).toFixed(0).toString() + '%'}
            progressPercent={((progress.progress + 1) * 100) / 4}
          />
        </>
      )}
    </SafeAreaView>
  );
};

export default ComputingTxContent;
