/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { space20 } from '@app/theme';
import { ScrollView, View } from 'react-native';

import { ContextAppLoading } from '@app/context';
import ProgressState, { ProgressStateKind } from '@ui/widgets/ProgressState';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';

export type WalletProgressKind = 'import' | 'create';

type WalletProgressProps = {
  kind: WalletProgressKind;
};

const CENTER_TOP = 300 / 874;

type ProgressScreenProps = {
  state: ProgressStateKind;
  title: string;
  body?: string;
  /** The buttons of a finished state, at the one bottom distance. */
  footer?: React.ReactNode;
};

/** A wallet being made, or made: the dots, then the ring, its title and body. */
export function ProgressScreen({
  state,
  title,
  body,
  footer,
}: ProgressScreenProps) {
  const [height, setHeight] = useState<number>(0);
  const { edges, fades } = useScrollEdges();
  const bottomPad = useBottomActionPad();

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
        <ProgressState state={state} title={title} body={body} />
      </ScrollView>
      {fades}
      {!!footer && (
        <View style={{ paddingHorizontal: space20, paddingBottom: bottomPad }}>
          {footer}
        </View>
      )}
    </>
  );
}

const WalletProgress: React.FunctionComponent<WalletProgressProps> = ({
  kind,
}) => {
  const { translate } = useContext(ContextAppLoading);
  return (
    <ProgressScreen
      state="working"
      title={
        translate(
          kind === 'import'
            ? 'import.importing-title'
            : 'loadingapp.creating-title',
        ) as string
      }
    />
  );
};

export default WalletProgress;
