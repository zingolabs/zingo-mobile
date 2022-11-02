/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView } from 'react-native';
import * as Progress from 'react-native-progress';

import { SendProgress } from '../../AppState';
import RegText from '../../../components/Components/RegText';

import { useTheme } from '@react-navigation/native';

type ComputingTxContentProps = {
  progress: SendProgress;
};

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({ progress }) => {
  const { colors } = useTheme();

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
          {/*<Progress.CircleSnail
            progress={progress.progress / progress.total}
            indeterminate={!progress.progress}
            size={100}
            color={colors.primary}
          />*/}
        </>
      )}
    </SafeAreaView>
  );
};

export default ComputingTxContent;
