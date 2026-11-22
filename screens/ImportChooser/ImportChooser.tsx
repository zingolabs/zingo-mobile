/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { space8, space16, space20, space24, useTheme } from '@app/theme';
import { ContextAppLoading } from '@app/context';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { HistoryIcon } from '@ui/primitives/Icons/HistoryIcon';
import { KeyboardIcon } from '@ui/primitives/Icons/KeyboardIcon';
import { useCompact } from '@app/hooks/useCompact';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import OptionCard from '@ui/widgets/OptionCard';

type ImportChooserProps = {
  busy: boolean;
  onPrevious: () => void;
  onSeed: () => void;
  onBack: () => void;
};

// The system store that keeps the recovery phrase, by its platform name.
const SECURE_STORE = Platform.OS === 'ios' ? 'Keychain' : 'Keystore';

const ImportChooser: React.FunctionComponent<ImportChooserProps> = ({
  busy,
  onPrevious,
  onSeed,
  onBack,
}) => {
  const { translate } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const { gap } = useCompact();
  const { edges, fades } = useScrollEdges();

  return (
    <View style={{ flex: 1 }}>
      <TitleBar
        title={translate('import.screen-title') as string}
        left={{
          icon: ChevronLeft,
          onPress: onBack,
          accessibilityLabel: translate('import.back-acc') as string,
          testID: 'import.chooser.back',
          accent: true,
          disabled: busy,
        }}
      />
      <ScrollView
        {...edges}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          variant="caption"
          tone="muted"
          style={{
            marginTop: gap(space24),
            marginHorizontal: space20,
            textAlign: 'center',
          }}
        >
          {translate('import.chooser-sub') as string}
        </Text>
        <View style={{ marginTop: space16, marginHorizontal: space20 }}>
          <OptionCard
            testID="import.chooser.previous"
            icon={HistoryIcon}
            iconBg={colors.bgAccentSubtle}
            iconColor={colors.fgAccent}
            title={translate('import.chooser-previous') as string}
            sub={(translate('import.chooser-previous-sub') as string).replace(
              '{store}',
              SECURE_STORE,
            )}
            subColor={colors.fgMuted}
            disabled={busy}
            onPress={onPrevious}
          />
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', marginVertical: space8 }}
          >
            {translate('import.chooser-or') as string}
          </Text>
          <OptionCard
            testID="import.chooser.seed"
            icon={KeyboardIcon}
            iconBg={colors.bgAccentSubtle}
            iconColor={colors.fgAccent}
            title={translate('import.chooser-seed') as string}
            sub={translate('import.chooser-seed-sub') as string}
            subColor={colors.fgMuted}
            disabled={busy}
            onPress={onSeed}
          />
        </View>
      </ScrollView>
      {fades}
    </View>
  );
};

export default ImportChooser;
