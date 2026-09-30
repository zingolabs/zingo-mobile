/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import { ContextAppLoading } from '@app/context';
import ProgressState from '@ui/widgets/ProgressState';

export type WalletProgressKind = 'import' | 'create';

type WalletProgressProps = {
  kind: WalletProgressKind;
  done: boolean;
};

const CENTER_TOP = 300 / 874;

const WalletProgress: React.FunctionComponent<WalletProgressProps> = ({
  kind,
  done,
}) => {
  const { translate } = useContext(ContextAppLoading);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View
        style={{
          position: 'absolute',
          left: 32,
          right: 32,
          top: `${CENTER_TOP * 100}%`,
          alignItems: 'center',
        }}
      >
        <ProgressState
          state={done ? 'done' : 'working'}
          title={
            translate(
              kind === 'import'
                ? done
                  ? 'import.imported-title'
                  : 'import.importing-title'
                : done
                  ? 'loadingapp.created-title'
                  : 'loadingapp.creating-title',
            ) as string
          }
          body={
            translate(
              done
                ? 'import.imported-body'
                : kind === 'import'
                  ? 'import.importing-body'
                  : 'loadingapp.creating-body',
            ) as string
          }
        />
      </View>
    </View>
  );
};

export default WalletProgress;
