/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, GlobalConst, RouteEnum } from '../../app/AppState';
import { migrationStatus, rescheduleParts } from '../../app/walletBackend';
import { RPCMigrationStatusType } from '../../app/walletBackend/types/RPCMigrationStatusType';

type MigrationCadenceProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationCadence
>;

// Zcash target block spacing, for turning a window count into a duration.
const SECONDS_PER_BLOCK = 75;
// zingolib's provisional default cadence (MigrationParams.k_max); the status
// normally supplies the live value, this is only the offline fallback.
const DEFAULT_PER_BUCKET = 8;

type CadenceChoice = 'fewer' | 'more';

// "~4 batches · finishes in about 21 hours" — the consequence line each
// preset card carries, so the user chooses with the real trade-off visible.
const durationText = (
  batches: number,
  bucketModulus: number,
  translate: (key: string) => string,
): string => {
  const hours = Math.max(
    1,
    Math.round((batches * bucketModulus * SECONDS_PER_BLOCK) / 3600),
  );
  if (hours < 48) {
    return translate('migrationcadence.duration-hours').replace(
      '{n}',
      String(hours),
    );
  }
  return translate('migrationcadence.duration-days').replace(
    '{n}',
    String(Math.round(hours / 24)),
  );
};

type PresetCardProps = {
  title: string;
  body: string;
  batches: number;
  duration: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeType['colors'];
};

const PresetCard: React.FunctionComponent<PresetCardProps> = ({
  title,
  body,
  batches,
  duration,
  selected,
  onPress,
  colors,
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={{
      borderWidth: 1.5,
      borderColor: selected ? colors.primary : colors.bottomSheetBorder,
      backgroundColor: colors.bottomSheetBackground,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
    }}
  >
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
        {title}
      </Text>
      <Text
        style={{ color: colors.placeholder, fontSize: 16, fontWeight: '600' }}
      >
        ~{batches}
      </Text>
    </View>
    <Text
      style={{
        color: colors.placeholder,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 6,
      }}
    >
      {body}
    </Text>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
      {duration}
    </Text>
  </TouchableOpacity>
);

// The phase 2 cadence chooser ("How many batches?"). Presented in the same
// session that received SplittingComplete; "Review schedule" records the
// choice via reschedule_parts (re-callable until the first part is signed)
// and hands off to the schedule review screen, which arms the reminders.
const MigrationCadence: React.FunctionComponent<MigrationCadenceProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<CadenceChoice>('fewer');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const statusStr = await migrationStatus();
      if (cancelled) {
        return;
      }
      if (statusStr.toLowerCase().startsWith(GlobalConst.error)) {
        setErrorMsg(statusStr);
        setLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(statusStr) as RPCMigrationStatusType;
        if (parsed.error) {
          setErrorMsg(parsed.error);
        } else {
          setStatus(parsed);
        }
      } catch (e) {
        setErrorMsg(`${e}`);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parts = status?.parts_total ?? 0;
  const bucketModulus = status?.bucket_modulus ?? 256;
  // The "fewer" preset IS zingolib's default cadence, so we never invent a
  // second opinion about a privacy parameter; "more" is maximum dispersion.
  const fewerPerBucket = status?.per_bucket ?? DEFAULT_PER_BUCKET;
  const fewerBatches = Math.max(
    1,
    Math.ceil(parts / Math.max(1, fewerPerBucket)),
  );
  const moreBatches = Math.max(1, parts);

  const windowHours = ((bucketModulus * SECONDS_PER_BLOCK) / 3600).toFixed(1);

  const onReview = useCallback(async () => {
    if (submitting) {
      return;
    }
    const perBucket = selected === 'fewer' ? fewerPerBucket : 1;
    setSubmitting(true);
    let failure: string | null = null;
    const rescheduleStr = await rescheduleParts(perBucket);
    if (rescheduleStr.toLowerCase().startsWith(GlobalConst.error)) {
      failure = rescheduleStr;
    } else {
      try {
        const parsed = JSON.parse(rescheduleStr);
        if (parsed.error) {
          failure = parsed.error;
        }
      } catch (e) {
        failure = `${e}`;
      }
    }
    setSubmitting(false);
    if (!failure) {
      navigation.navigate(RouteEnum.MigrationSchedule, { perBucket });
      return;
    }
    // CadenceFixed: a part is already signed, so the existing schedule
    // stands — reviewing it (and re-arming reminders) is still valid.
    if (failure.toLowerCase().includes('cadence')) {
      addLastSnackbar(translate('migrationcadence.cadence-fixed') as string);
      navigation.navigate(RouteEnum.MigrationSchedule, { perBucket });
      return;
    }
    addLastSnackbar(failure);
  }, [
    submitting,
    selected,
    fewerPerBucket,
    navigation,
    addLastSnackbar,
    translate,
  ]);

  // ----- Loading / error -----
  if (loading || errorMsg) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Text
            style={{
              color: colors.placeholder,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </Text>
        )}
      </View>
    );
  }

  const intro = (translate('migrationcadence.intro') as string)
    .replace('{notes}', String(parts))
    .replace('{blocks}', String(bucketModulus))
    .replace('{hours}', windowHours);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StepperHeader splitDone={true} sendActive={true} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
          {translate('migrationcadence.title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {intro.split('**').map((part: string, i: number) =>
            i % 2 === 1 ? (
              <Text key={i} style={{ color: colors.text, fontWeight: '700' }}>
                {part}
              </Text>
            ) : (
              <Text key={i}>{part}</Text>
            ),
          )}
        </Text>

        <BoldText style={{ fontSize: 17, marginBottom: 14 }}>
          {translate('migrationcadence.how-many') as string}
        </BoldText>

        <PresetCard
          title={translate('migrationcadence.fewer-title') as string}
          body={translate('migrationcadence.fewer-body') as string}
          batches={fewerBatches}
          duration={durationText(
            fewerBatches,
            bucketModulus,
            (key: string) => translate(key) as string,
          )}
          selected={selected === 'fewer'}
          onPress={() => setSelected('fewer')}
          colors={colors}
        />
        <PresetCard
          title={translate('migrationcadence.more-title') as string}
          body={translate('migrationcadence.more-body') as string}
          batches={moreBatches}
          duration={durationText(
            moreBatches,
            bucketModulus,
            (key: string) => translate(key) as string,
          )}
          selected={selected === 'more'}
          onPress={() => setSelected('more')}
          colors={colors}
        />

        {/* ZIP 318 correlation disclosure: shown once, here, for the whole
            manual-execution mode — not per send. */}
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 13,
            lineHeight: 19,
            marginTop: 10,
          }}
        >
          {translate('migrationcadence.disclosure') as string}
        </Text>
      </ScrollView>

      <View
        style={{
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}
      >
        <Button
          testID="migrationcadence.review"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationcadence.review') as string}
          onPress={onReview}
          disabled={submitting}
        />
      </View>
    </View>
  );
};

export default MigrationCadence;
