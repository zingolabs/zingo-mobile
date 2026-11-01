/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { space20 } from '@app/theme';
import { ScrollView } from 'react-native';

import { ContextAppLoading } from '@app/context';
import ProgressState from '@ui/widgets/ProgressState';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';

export type WalletProgressKind = 'import' | 'create';

type WalletProgressProps = {
  kind: WalletProgressKind;
};

const CENTER_TOP = 300 / 874;

const WalletProgress: React.FunctionComponent<WalletProgressProps> = ({
  kind,
}) => {
  const { translate } = useContext(ContextAppLoading);
  const [height, setHeight] = useState<number>(0);
  const { edges, fades } = useScrollEdges();

  return (
    <>
      <ScrollView
        {...edges}
        onLayout={e => {
          edges.onLayout(e);
          setHeight(e.nativeEvent.layout.height);
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: height * CENTER_TOP,
          paddingHorizontal: space20,
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
      </ScrollView>
      {fades}
    </>
  );
};

export default WalletProgress;
