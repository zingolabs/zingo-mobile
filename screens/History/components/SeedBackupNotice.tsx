import React, { useContext, useRef } from 'react';
import { View } from 'react-native';
import {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import Tag from '@ui/widgets/Tag';

type SeedBackupNoticeProps = {
  // The flow is open over the card: its contents step aside for the container transform.
  covered: boolean;
  /** The backup is done: the tag turns green before the card leaves the stack. */
  backedUp?: boolean;
  onBackUp: (from: CardRect) => void;
};

// The seed phrase notice on History. Back up opens the flow from this card.
const SeedBackupNotice: React.FunctionComponent<SeedBackupNoticeProps> = ({
  covered,
  backedUp,
  onBackUp,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const card = useRef<View>(null);

  const contents = useAnimatedStyle(() => ({
    opacity: withTiming(covered ? 0 : 1, {
      duration: covered ? duration.fast : duration.base,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    }),
  }));

  const open = () =>
    card.current?.measureInWindow((x, y, width, height) =>
      onBackUp({ x, y, width, height }),
    );

  return (
    <Banner
      ref={card}
      testID="seedbackup.notice"
      tone="seed"
      title={translate('seednotice.title') as string}
      // Only the green pill a finished backup shows before the notice leaves:
      // the tile and the text already say it is not backed up.
      tag={
        backedUp ? (
          <Tag tone="accent">{translate('seednotice.done') as string}</Tag>
        ) : undefined
      }
      contentStyle={contents}
      actionBeside
      action={
        <Button
          testID="seedbackup.start"
          variant="primary"
          size="small"
          inline
          title={translate('seednotice.button') as string}
          onPress={open}
        />
      }
    >
      {translate('seednotice.body-pending') as string}
    </Banner>
  );
};

export default SeedBackupNotice;
