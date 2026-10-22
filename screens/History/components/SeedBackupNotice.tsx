import React, { useContext, useRef } from 'react';
import { View } from 'react-native';
import {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { ease } from '@app/theme/motion';
import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import NoticeCard from '@ui/widgets/NoticeCard';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';

type SeedBackupNoticeProps = {
  // The flow is open over the card: its contents step aside for the container transform.
  covered: boolean;
  /** The backup is done: the pill turns green before the card leaves the stack. */
  backedUp?: boolean;
  onBackUp: (from: CardRect) => void;
};

const COVER_MS = 120;
const UNCOVER_MS = 200;

// The seed phrase notice on History. Back up opens the flow from this card.
const SeedBackupNotice: React.FunctionComponent<SeedBackupNoticeProps> = ({
  covered,
  backedUp,
  onBackUp,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const card = useRef<View>(null);

  const contents = useAnimatedStyle(() => ({
    opacity: withTiming(covered ? 0 : 1, {
      duration: covered ? COVER_MS : UNCOVER_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    }),
  }));

  const open = () =>
    card.current?.measureInWindow((x, y, width, height) =>
      onBackUp({ x, y, width, height }),
    );

  return (
    <NoticeCard
      ref={card}
      testID="seedbackup.notice"
      icon={<SproutIcon size={16} color={colors.fgPriceUp} />}
      title={translate('seednotice.title') as string}
      pill={
        backedUp
          ? { text: translate('seednotice.done') as string, tone: 'positive' }
          : { text: translate('seednotice.pending') as string, tone: 'warning' }
      }
      body={translate('seednotice.body-pending') as string}
      contentStyle={contents}
      action={{
        title: translate('seednotice.button') as string,
        onPress: open,
        testID: 'seedbackup.start',
      }}
    />
  );
};

export default SeedBackupNotice;
