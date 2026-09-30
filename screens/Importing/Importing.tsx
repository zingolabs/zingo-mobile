/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { useTheme } from '@app/theme';
import { ContextAppLoading } from '@app/context';
import { ScreenEnum } from '@app/AppState';
import AppSheet from '@ui/primitives/AppSheet';
import Header from '@ui/widgets/Header';
import ProgressState from '@ui/widgets/ProgressState';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';

type ImportingProps = {
  done: boolean;
};

const Importing: React.FunctionComponent<ImportingProps> = ({ done }) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo } = context;
  const { colors } = useTheme();
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useFullSheetSnapPoints(containerH, headerH);

  return (
    <View
      style={{ flex: 1, backgroundColor: 'transparent' }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={ScreenEnum.ImportUfvk}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          translate={translate}
          netInfo={netInfo}
        />
      </View>
      <AppSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        contentStyle={{
          paddingHorizontal: 24,
          paddingTop: 106,
          paddingBottom: 106,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgSurface,
        }}
      >
        <ProgressState
          state={done ? 'done' : 'working'}
          title={
            translate(
              done ? 'import.imported-title' : 'import.importing-title',
            ) as string
          }
          body={
            translate(
              done ? 'import.imported-body' : 'import.importing-body',
            ) as string
          }
        />
      </AppSheet>
    </View>
  );
};

export default Importing;
