import React, { useContext, useRef } from 'react';
import { View } from 'react-native';

import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';

type ViewOnlyNoticeProps = {
  onViewKey: (from: CardRect) => void;
  onDismiss: () => void;
};

// The view-only card on History. View key grows it into the viewing key
// screen; the X removes it for this wallet.
const ViewOnlyNotice: React.FunctionComponent<ViewOnlyNoticeProps> = ({
  onViewKey,
  onDismiss,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const card = useRef<View>(null);

  const open = () =>
    card.current?.measureInWindow((x, y, width, height) =>
      onViewKey({ x, y, width, height }),
    );

  return (
    <Banner
      ref={card}
      testID="viewonly.notice"
      tone="viewOnly"
      title={translate('viewonly.title') as string}
      onDismiss={onDismiss}
      dismissLabel={translate('viewonly.dismiss-acc') as string}
      dismissTestID="viewonly.dismiss"
      actionBeside
      action={
        <Button
          testID="viewonly.viewkey"
          variant="text"
          size="small"
          inline
          title={translate('viewonly.button') as string}
          onPress={open}
        />
      }
    >
      {translate('viewonly.body') as string}
    </Banner>
  );
};

export default ViewOnlyNotice;
