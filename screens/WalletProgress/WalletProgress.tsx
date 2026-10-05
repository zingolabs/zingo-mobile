/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import { ContextAppLoading } from '@app/context';
import ProgressState from '@ui/widgets/ProgressState';

export type WalletProgressKind = 'import' | 'create';

type WalletProgressProps = {
  kind: WalletProgressKind;
};

const CENTER_TOP = 300 / 874;

const WalletProgress: React.FunctionComponent<WalletProgressProps> = ({
  kind,
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
          state="working"
          title={
            translate(
              kind === 'import'
                ? 'import.importing-title'
                : 'loadingapp.creating-title',
            ) as string
          }
        />
      </View>
    </View>
  );
};

export default WalletProgress;
