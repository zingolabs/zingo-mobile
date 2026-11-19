/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TranslateType } from '@app/AppState';
import { space4, space8, space16, space20 } from '@app/theme';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import Button from '@ui/primitives/Button';
import Text from '@ui/primitives/Text';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import TitleBar from '@ui/widgets/TitleBar';
import { NameField, WalletHero } from '@screens/AddWallet/draftParts';
import RoomNote from '@screens/AddWallet/RoomNote';
import { useRoomForWallet } from '@app/hooks/useRoomForWallet';

type NameWalletProps = {
  /** What the first wallet is made from: a new seed, a seed phrase or a viewing key. */
  from: 'create' | 'seed' | 'key';
  translate: (key: string) => TranslateType;
  placeholder: string;
  busy: boolean;
  onBack: () => void;
  onGo: (name: string) => void;
};

/** The onboarding's step before the first wallet is made: its optional name. */
const NameWallet: React.FC<NameWalletProps> = ({
  from,
  translate,
  placeholder,
  busy,
  onBack,
  onGo,
}) => {
  const t = (key: string) => translate(key) as string;
  const bottomPad = useBottomActionPad();
  const [name, setName] = useState('');
  const room = useRoomForWallet();
  return (
    <View style={{ flex: 1 }}>
      <TitleBar
        title={t('onboarding.name-title')}
        left={{
          icon: ChevronLeft,
          accent: true,
          accessibilityLabel: t('import.back-acc'),
          onPress: onBack,
          disabled: busy,
          testID: 'namewallet.back',
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space20,
          paddingTop: space16,
        }}
      >
        <WalletHero
          from={from}
          lead={t(
            from === 'create'
              ? 'onboarding.name-create'
              : from === 'key'
                ? 'onboarding.name-key'
                : 'onboarding.name-seed',
          )}
        />
        <NameField
          value={name}
          onChange={setName}
          placeholder={placeholder}
          translate={translate}
        />
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: space8, marginHorizontal: space4 }}
        >
          {t('onboarding.name-later')}
        </Text>
      </ScrollView>
      <View style={{ paddingHorizontal: space20, paddingBottom: bottomPad }}>
        <RoomNote room={room} translate={translate} />
        <Button
          testID="namewallet.go"
          variant="primary"
          title={t(
            from === 'create' ? 'onboarding.create-go' : 'onboarding.import-go',
          )}
          disabled={busy || room.kind === 'full'}
          onPress={() => onGo(name.trim() || placeholder)}
        />
      </View>
    </View>
  );
};

export default NameWallet;
