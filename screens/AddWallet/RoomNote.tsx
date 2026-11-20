import React from 'react';
import { View } from 'react-native';
import type { TranslateType } from '@app/AppState';
import type { WalletRoom } from '@app/hooks/useRoomForWallet';
import { space12 } from '@app/theme';
import Banner from '@ui/widgets/Banner';

/** The warning over a save button when the device lacks the room a wallet needs. */
export default function RoomNote({
  room,
  translate,
}: {
  room: WalletRoom;
  translate: (key: string) => TranslateType;
}) {
  if (room.kind !== 'full') {
    return <></>;
  }
  return (
    <View style={{ marginBottom: space12 }}>
      <Banner
        tone="warning"
        title={(translate('disk.full-note') as string).replace(
          '{mb}',
          String(room.mb),
        )}
      />
    </View>
  );
}
