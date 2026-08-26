/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import NymGateSheet from './components/NymGateSheet';
import { deriveNymGateState } from './components/nymGateState';
import { AppDrawerParamList } from '../../app/types';
import { AppTheme } from '../../app/theme';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';

type MigrationStrategyProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationStrategy
> & {
  // Opens or closes the nym gate sheet from outside. Storybook sets it; the
  // app leaves it unset and the Start button drives the sheet.
  nymSheetOpen?: boolean;
};

// Migration choices: opt out entirely ('none', the default), the immediate
// drain ('now'), or the private two-phase path ('private': split notes, then
// send batches inside scheduled windows).
type StrategyOption = 'none' | 'now' | 'private';

// Renders a translated string, bolding `**…**` spans in `highlight` and
// `##…##` spans in `accent` (falling back to `highlight`), so a single
// translation keeps its natural word order per language.
const BoldSplitText: React.FunctionComponent<{
  text: string;
  color: string;
  highlight: string;
  fontSize: number;
  lineHeight: number;
  marginBottom?: number;
  accent?: string;
}> = ({
  text,
  color,
  highlight,
  fontSize,
  lineHeight,
  marginBottom = 0,
  accent,
}) => (
  <Text style={{ color, fontSize, lineHeight, marginBottom }}>
    {text.split(/(\*\*[^*]+\*\*|##[^#]+##)/g).map((part: string, i: number) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={{ color: highlight, fontWeight: '700' }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith('##') && part.endsWith('##')) {
        return (
          <Text
            key={i}
            style={{ color: accent ?? highlight, fontWeight: '700' }}
          >
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    })}
  </Text>
);

// A single-selectable radio indicator: an outlined circle that fills when
// selected.
const RadioDot: React.FunctionComponent<{
  selected: boolean;
  activeColor: string;
  inactiveColor: string;
}> = ({ selected, activeColor, inactiveColor }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: selected ? activeColor : inactiveColor,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {selected ? (
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: activeColor,
        }}
      />
    ) : null}
  </View>
);

type OptionCardProps = {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
  colors: AppTheme['colors'];
  accent?: string;
};

const OptionCard: React.FunctionComponent<OptionCardProps> = ({
  title,
  body,
  selected,
  onPress,
  colors,
  accent,
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={{
      borderWidth: 1.5,
      borderColor: selected ? colors.borderAccent : colors.bottomSheetBorder,
      backgroundColor: colors.bgSurface,
      borderRadius: 14,
      padding: 18,
    }}
  >
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}
      >
        <Text
          style={{ color: colors.fgDefault, fontSize: 17, fontWeight: '700' }}
        >
          {title}
        </Text>
      </View>
      <RadioDot
        selected={selected}
        activeColor={colors.fgAccent}
        inactiveColor={colors.borderMuted}
      />
    </View>
    <BoldSplitText
      text={body}
      color={colors.fgMuted}
      highlight={colors.fgDefault}
      accent={accent}
      fontSize={14}
      lineHeight={21}
    />
  </TouchableOpacity>
);

const MigrationStrategy: React.FunctionComponent<MigrationStrategyProps> = ({
  navigation,
  nymSheetOpen,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, totalBalance, info, nym, setNymOption, mixnetView } =
    context;
  const { colors } = useTheme();
  const [selected, setSelected] = useState<StrategyOption>('none');

  const nymSheetRef = useRef<BottomSheetModal>(null);
  useEffect(() => {
    if (nymSheetOpen === undefined) {
      return;
    }
    if (nymSheetOpen) {
      nymSheetRef.current?.present();
    } else {
      nymSheetRef.current?.dismiss();
    }
  }, [nymSheetOpen]);
  // Held from the Enable tap until the transport is ready, mirroring the send
  // toggle: the button reads disabled-and-connecting until then.
  const [enabling, setEnabling] = useState<boolean>(false);
  const nymGate = deriveNymGateState(enabling, mixnetView);

  // Leaving the migration flow returns to Home. Reset (not goBack) so the
  // one-way onboarding/migration stack isn't left underneath to return to.
  // Migration is opt-in, so the X exits straight away without a confirm.
  const closeMigration = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  const startMigration = useCallback(() => {
    navigation.navigate(
      selected === 'private'
        ? RouteEnum.MigrationSplitPlan
        : RouteEnum.MigrationTransactions,
    );
  }, [navigation, selected]);

  // Ends the enable wait once the transport settles: ready continues the
  // migration, a lost transport releases the button. A reconnecting
  // bootstrap is neither, so the wait holds through the blip.
  useEffect(() => {
    if (!enabling) {
      return;
    }
    if (nymGate.kind === 'ready') {
      setEnabling(false);
      nymSheetRef.current?.dismiss();
      startMigration();
      return;
    }
    if (nymGate.kind === 'failed') {
      setEnabling(false);
    }
  }, [enabling, nymGate.kind, startMigration]);

  // Orchard balance shown so the user sees what would cross the pool boundary
  // (and become publicly visible) on the immediate path.
  const orchardAmount = totalBalance ? totalBalance.totalOrchardBalance : 0;
  const amountStr = `${Utils.parseNumberFloatToStringLocale(
    orchardAmount,
    4,
  )} ${info.currencyName}`;
  const nowBody = (translate('migrationstrategy.now-body') as string).replace(
    '{amount}',
    amountStr,
  );

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        {/* Escape hatch: exit the migration flow back to Home. */}
        <TouchableOpacity
          testID="migrationstrategy.close"
          onPress={closeMigration}
          accessibilityLabel={translate('migrationstrategy.close') as string}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            zIndex: 10,
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesomeIcon icon={faXmark} size={22} color={colors.fgMuted} />
        </TouchableOpacity>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 24,
          }}
        >
          <BoldText
            style={{ fontSize: 22, textAlign: 'center', marginBottom: 28 }}
          >
            {translate('migrationstrategy.title') as string}
          </BoldText>

          <BoldSplitText
            text={translate('migrationstrategy.intro') as string}
            color={colors.fgMuted}
            highlight={colors.fgDefault}
            fontSize={16}
            lineHeight={24}
            marginBottom={28}
          />

          <OptionCard
            title={translate('migrationstrategy.none-label') as string}
            body={translate('migrationstrategy.none-body') as string}
            selected={selected === 'none'}
            onPress={() => setSelected('none')}
            colors={colors}
          />
          <View style={{ height: 14 }} />
          <OptionCard
            title={translate('migrationstrategy.now-label') as string}
            body={nowBody}
            selected={selected === 'now'}
            onPress={() => setSelected('now')}
            colors={colors}
            accent={colors.fgWarning}
          />
          <View style={{ height: 14 }} />
          <OptionCard
            title={translate('migrationstrategy.private-label') as string}
            body={translate('migrationstrategy.private-body') as string}
            selected={selected === 'private'}
            onPress={() => setSelected('private')}
            colors={colors}
          />
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingVertical: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            testID="migrationstrategy.back"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationstrategy.back') as string}
            onPress={() => navigation.goBack()}
            twoButtons={true}
          />
          <Button
            testID="migrationstrategy.start"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstrategy.start') as string}
            onPress={() => {
              if (selected === 'none') {
                closeMigration();
                return;
              }
              if (nym) {
                if (nymGate.kind === 'ready') {
                  startMigration();
                  return;
                }
                setEnabling(true);
              }
              nymSheetRef.current?.present();
            }}
            twoButtons={true}
          />
        </View>
      </View>

      <NymGateSheet
        ref={nymSheetRef}
        gate={nymGate}
        onDismiss={() => setEnabling(false)}
        onContinue={() => {
          setEnabling(false);
          nymSheetRef.current?.dismiss();
          startMigration();
        }}
        onEnable={() => {
          setEnabling(true);
          setNymOption(true);
        }}
      />
    </>
  );
};

export default MigrationStrategy;
