/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import StepperHeader from '@ui/widgets/StepperHeader';
import { AppDrawerParamList } from '@app/types';
import { AppTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { ButtonTypeEnum, RouteEnum } from '@app/AppState';
import {
  migrationStatus,
  planIronwoodMigration,
  routeCadencePlan,
  routeStartMigration,
  startIronwoodMigration,
} from '@app/walletBackend';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

type MigrationCadenceProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationCadence
>;

const ZATS_PER_ZEC = 10 ** 8;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

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
  colors: AppTheme['colors'];
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
      borderColor: selected ? colors.borderAccent : colors.bottomSheetBorder,
      backgroundColor: colors.bgSurface,
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
      <Text style={{ color: colors.fgDefault, fontSize: 17, fontWeight: '700' }}>
        {title}
      </Text>
      <Text
        style={{ color: colors.fgMuted, fontSize: 16, fontWeight: '600' }}
      >
        ~{batches}
      </Text>
    </View>
    <Text
      style={{
        color: colors.fgMuted,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 6,
      }}
    >
      {body}
    </Text>
    <Text style={{ color: colors.fgDefault, fontSize: 13, fontWeight: '600' }}>
      {duration}
    </Text>
  </TouchableOpacity>
);

// The Phase 2 cadence chooser ("How many batches?"), shown once splitting
// completes. The notes are fully split by now, so this is where Phase 2 consent
// is captured: "Review schedule" calls start_ironwood_migration with the chosen
// per-bucket cadence, binding the parts and scheduling them, then hands off to
// the schedule review screen that arms the reminders. There is no migration
// state yet, so the part count and the fresh consent hash come from a live
// plan_ironwood_migration read (ADR 0016), and the bucket cadence params from
// migration_status's provisional values.
const MigrationCadence: React.FunctionComponent<MigrationCadenceProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar } = context;
  const { colors } = useTheme();

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [plan, setPlan] = useState<RPCMigrationPlanType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<CadenceChoice>('fewer');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const [statusResult, planResult] = await Promise.all([
      migrationStatus(),
      planIronwoodMigration(),
    ]);
    if (!statusResult.ok) {
      setErrorMsg(statusResult.error.message);
      setLoading(false);
      return;
    }
    if (!planResult.ok) {
      setErrorMsg(planResult.error.message);
      setLoading(false);
      return;
    }
    try {
      const parsedStatus = JSON.parse(
        statusResult.value,
      ) as RPCMigrationStatusType;
      const parsedPlan = JSON.parse(planResult.value) as RPCMigrationPlanType;
      if (parsedStatus.error) {
        setErrorMsg(parsedStatus.error);
      } else if (parsedPlan.error) {
        setErrorMsg(parsedPlan.error);
      } else {
        setStatus(parsedStatus);
        setPlan(parsedPlan);
      }
    } catch (e) {
      setErrorMsg(`${e}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const planRoute = plan ? routeCadencePlan(plan) : null;
  const parts = planRoute?.kind === 'choose' ? planRoute.parts : 0;
  const bucketModulus = status?.bucket_modulus ?? 144;
  // The "fewer" preset IS zingolib's default cadence, so we never invent a
  // second opinion about a privacy parameter; "more" is maximum dispersion.
  const fewerPerBucket = status?.per_bucket ?? DEFAULT_PER_BUCKET;
  const fewerBatches = Math.max(
    1,
    Math.ceil(parts / Math.max(1, fewerPerBucket)),
  );
  const moreBatches = Math.max(1, parts);

  const windowHours = ((bucketModulus * SECONDS_PER_BLOCK) / 3600).toFixed(1);

  // Review = Phase 2 consent: start_ironwood_migration binds the parts to the
  // now-split notes and schedules them under the chosen cadence. Its consent
  // hash is the plan we just read (post-split), not the pre-split one.
  const onReview = useCallback(async () => {
    if (submitting || !plan?.plan_hash) {
      return;
    }
    const perBucket = selected === 'fewer' ? fewerPerBucket : 1;
    setSubmitting(true);
    const start = await startIronwoodMigration(plan.plan_hash, perBucket);
    setSubmitting(false);
    const route = routeStartMigration(start);
    switch (route.kind) {
      case 'proceed':
        navigation.navigate(RouteEnum.MigrationSchedule, { perBucket });
        return;
      // A migration already exists (re-entry after Phase 2 already started):
      // its schedule stands — review it.
      case 'resume':
        navigation.navigate(RouteEnum.MigrationSchedule, { perBucket });
        return;
      // ConsentStale: notes changed between the plan read and this call. Reload
      // the fresh figures so the user reviews and schedules against them.
      case 'replan':
        addLastSnackbar(translate('migrationcadence.replanned') as string);
        load();
        return;
      case 'error':
        addLastSnackbar(route.message);
    }
  }, [
    submitting,
    plan,
    selected,
    fewerPerBucket,
    navigation,
    addLastSnackbar,
    translate,
    load,
  ]);

  // ----- Loading / error -----
  if (loading || errorMsg) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.fgAccent} />
        ) : (
          <Text
            style={{
              color: colors.fgMuted,
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

  // ----- Nothing to schedule -----
  // Consenting to a plan with no notes binds a migration with no batches and
  // no way forward, so both empty plans stop here. Dust is terminal; an
  // unanchored split resolves in a block or two, which is what Try again is
  // for.
  if (planRoute && planRoute.kind !== 'choose') {
    const dust = planRoute.kind === 'dust';
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <StepperHeader splitDone={true} sendActive={true} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <BoldText
            style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}
          >
            {
              translate(
                dust
                  ? 'migrationcadence.dust-title'
                  : 'migrationcadence.unconfirmed-title',
              ) as string
            }
          </BoldText>
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            {dust
              ? (translate('migrationcadence.dust-body') as string).replace(
                  '{amount}',
                  fmt(planRoute.residual),
                )
              : (translate('migrationcadence.unconfirmed-body') as string)}
          </Text>
        </View>
        <View
          style={{
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Button
            testID={dust ? 'migrationcadence.back' : 'migrationcadence.retry'}
            type={ButtonTypeEnum.Primary}
            title={
              translate(
                dust ? 'migrationcadence.back' : 'migrationcadence.retry',
              ) as string
            }
            onPress={dust ? () => navigation.goBack() : load}
          />
        </View>
      </View>
    );
  }

  const intro = (translate('migrationcadence.intro') as string)
    .replace('{notes}', String(parts))
    .replace('{blocks}', String(bucketModulus))
    .replace('{hours}', windowHours);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
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
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {intro.split('**').map((part: string, i: number) =>
            i % 2 === 1 ? (
              <Text key={i} style={{ color: colors.fgDefault, fontWeight: '700' }}>
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
        <Text
          style={{
            color: colors.fgMuted,
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
