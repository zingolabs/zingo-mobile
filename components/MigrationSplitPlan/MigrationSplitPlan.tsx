/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../ui/BoldText';
import Button from '../ui/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList } from '../../app/types';
import { AppTheme } from '../../app/theme';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';
import { planIronwoodMigration } from '../../app/walletBackend';
import {
  RPCMigrationPlanType,
  RPCSplitTxType,
} from '../../app/walletBackend/types/RPCMigrationPlanType';

type MigrationSplitPlanProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSplitPlan
>;

const ZATS_PER_ZEC = 10 ** 8;

// A label/value line inside a bordered card.
const Row: React.FunctionComponent<{
  label: string;
  value: React.ReactNode;
  colors: AppTheme['colors'];
  bold?: boolean;
}> = ({ label, value, colors, bold = false }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingVertical: 8,
    }}
  >
    <Text style={{ color: colors.fgMuted, fontSize: 14, marginRight: 12 }}>
      {label}
    </Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
      {typeof value === 'string' ? (
        <Text
          style={{
            color: colors.fgDefault,
            fontSize: 14,
            fontWeight: bold ? '700' : '400',
            textAlign: 'right',
          }}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  </View>
);

const Card: React.FunctionComponent<{
  colors: AppTheme['colors'];
  children: React.ReactNode;
}> = ({ colors, children }) => (
  <View
    style={{
      borderWidth: 1,
      borderColor: colors.bottomSheetBorder,
      backgroundColor: colors.bgSurface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 14,
    }}
  >
    {children}
  </View>
);

// The Phase 1 disclosure screen of the private migration: renders the exact
// note-splitting plan (plus the fees and stranded value the whole migration
// implies). Phase 1 splitting carries no consent hash (ADR 0016) — the plan is
// the disclosure surface, and Accept simply proceeds to MigrationSplitting,
// which drives the stateless quick_split rounds. Phase 2 (the schedule) captures
// its own consent later, at the cadence screen.
const MigrationSplitPlan: React.FunctionComponent<MigrationSplitPlanProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info, totalBalance } = context;
  const { colors } = useTheme();

  const [plan, setPlan] = useState<RPCMigrationPlanType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencyName = info.currencyName;
  const zec = useCallback(
    (zats: number) =>
      `${Utils.parseNumberFloatToStringLocale(
        zats / ZATS_PER_ZEC,
        4,
      )} ${currencyName}`,
    [currencyName],
  );

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  // Fetch the split plan. Pure preview: nothing is signed or broadcast, and
  // the returned plan_hash is what Accept consents to.
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const planResult = await planIronwoodMigration();
    if (!planResult.ok) {
      setErrorMsg(planResult.error.message);
      setLoading(false);
      return;
    }
    try {
      const parsed: RPCMigrationPlanType = JSON.parse(planResult.value);
      if (parsed.error) {
        setErrorMsg(parsed.error);
      } else {
        setPlan(parsed);
      }
    } catch (e) {
      setErrorMsg(`${e}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Accept: Phase 1 has no consent hash (ADR 0016), so this just proceeds to
  // the stateless splitting rounds. The plan is passed through for the row
  // labels. Cadence captures the Phase 2 schedule consent afterwards. When the
  // notes are already part-ready (no rounds) Phase 1 is a no-op, so skip the
  // splitting ceremony and go straight to the Phase 2 cadence chooser.
  const onAccept = useCallback(() => {
    if (!plan) {
      return;
    }
    const hasSplits = (plan.split_rounds?.length ?? 0) > 0;
    if (!hasSplits && (plan.parts?.length ?? 0) > 0) {
      navigation.navigate(RouteEnum.MigrationCadence);
      return;
    }
    navigation.navigate(RouteEnum.MigrationSplitting, { plan });
  }, [plan, navigation]);

  const splitRounds = plan?.split_rounds ?? [];
  const roundCount = splitRounds.length;
  const txCount = splitRounds.reduce((sum, round) => sum + round.length, 0);
  const noteCount = plan?.parts?.length ?? 0;
  const orchardHeld = totalBalance ? totalBalance.confirmedOrchardBalance : 0;
  const noPlan = !loading && !errorMsg && txCount === 0 && noteCount === 0;
  const isPending = noPlan && (plan?.residual ?? 0) === 0 && orchardHeld > 0;
  const isEmpty = noPlan && !isPending;
  // Notes already the right size: nothing to split, but there is value to move.
  const noSplitNeeded = !loading && !errorMsg && txCount === 0 && noteCount > 0;

  const title = (
    <BoldText style={{ fontSize: 22, marginBottom: 8 }}>
      {translate('migrationsplitplan.title') as string}
    </BoldText>
  );

  // ----- Loading -----
  if (loading) {
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
        <ActivityIndicator size="large" color={colors.fgAccent} />
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          {translate('migrationsplitplan.loading') as string}
        </Text>
      </View>
    );
  }

  // ----- Error -----
  if (errorMsg) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.fgDefault,
                fontSize: 17,
                fontWeight: '700',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitplan.error-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </Text>
          </View>
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationsplitplan.back') as string}
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.fgDefault,
                fontSize: 17,
                fontWeight: '700',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitplan.pending-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitplan.pending-body') as string}
            </Text>
          </View>
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            testID="migrationsplitplan.pending-back"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationsplitplan.back') as string}
            onPress={() => navigation.goBack()}
            twoButtons={true}
          />
          <Button
            testID="migrationsplitplan.retry"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsplitplan.retry') as string}
            onPress={fetchPlan}
            twoButtons={true}
          />
        </View>
      </View>
    );
  }

  // ----- Nothing to migrate -----
  if (isEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.fgDefault,
                fontSize: 17,
                fontWeight: '700',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitplan.nothing-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {translate('migrationsplitplan.nothing-body') as string}
            </Text>
          </View>
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsplitplan.close') as string}
            onPress={goHome}
          />
        </View>
      </View>
    );
  }

  // ----- Notes already part-ready: no splitting, straight to Phase 2 -----
  if (noSplitNeeded) {
    const partsFee = plan?.parts_fee ?? 0;
    const stranded = plan?.residual ?? 0;
    const readyWord = translate(
      noteCount === 1
        ? 'migrationsplitplan.note-one'
        : 'migrationsplitplan.notes',
    ) as string;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <StepperHeader splitDone={true} sendActive={false} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <BoldText style={{ fontSize: 22, marginBottom: 8 }}>
            {translate('migrationsplitplan.nosplit-title') as string}
          </BoldText>
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {translate('migrationsplitplan.nosplit-body') as string}
          </Text>
          <Card colors={colors}>
            <Row
              label={translate('migrationsplitplan.nosplit-ready') as string}
              value={`${noteCount} ${readyWord}`}
              colors={colors}
              bold={true}
            />
            <Row
              label={translate('migrationsplitplan.sending-fee') as string}
              value={zec(partsFee)}
              colors={colors}
            />
            {stranded > 0 ? (
              <Row
                label={translate('migrationsplitplan.stranded') as string}
                value={zec(stranded)}
                colors={colors}
              />
            ) : null}
          </Card>
          {stranded > 0 ? (
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {translate('migrationsplitplan.stranded-note') as string}
            </Text>
          ) : null}
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            paddingHorizontal: 24,
          }}
        >
          <Button
            testID="migrationsplitplan.back"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationsplitplan.back') as string}
            onPress={() => navigation.goBack()}
            twoButtons={true}
          />
          <Button
            testID="migrationsplitplan.continue"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationsplitplan.continue') as string}
            onPress={onAccept}
            twoButtons={true}
          />
        </View>
      </View>
    );
  }

  // ----- Loaded plan -----
  const subtitleKey =
    txCount === 1
      ? 'migrationsplitplan.subtitle-one'
      : 'migrationsplitplan.subtitle';
  const subtitle = (translate(subtitleKey) as string).replace(
    '{count}',
    String(txCount),
  );
  const noteWord = translate(
    noteCount === 1
      ? 'migrationsplitplan.note-one'
      : 'migrationsplitplan.notes',
  ) as string;
  const txWord = translate(
    txCount === 1 ? 'migrationsplitplan.tx-one' : 'migrationsplitplan.txs',
  ) as string;
  const feeSuffix = translate('migrationsplitplan.fee-suffix') as string;
  const totalSummary = `${noteCount} ${noteWord} · ${txCount} ${txWord} · ${zec(
    plan?.split_fee ?? 0,
  )} ${feeSuffix}`;
  const confirmInValue =
    roundCount <= 1
      ? (translate('migrationsplitplan.confirm-in-value') as string)
      : (translate('migrationsplitplan.confirm-in-rounds') as string).replace(
          '{rounds}',
          String(roundCount),
        );

  // Global transaction numbering across rounds, so "Transaction 3" means the
  // same thing on this screen and on the splitting screen.
  let txNumber = 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <StepperHeader splitDone={false} sendActive={false} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        {title}
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: roundCount > 1 ? 10 : 24,
          }}
        >
          {subtitle.split('**').map((part: string, i: number) =>
            i % 2 === 1 ? (
              <Text
                key={i}
                style={{ color: colors.fgDefault, fontWeight: '700' }}
              >
                {part}
              </Text>
            ) : (
              <Text key={i}>{part}</Text>
            ),
          )}
        </Text>
        {roundCount > 1 ? (
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {(translate('migrationsplitplan.rounds-note') as string).replace(
              '{rounds}',
              String(roundCount),
            )}
          </Text>
        ) : null}

        {splitRounds.map((round: RPCSplitTxType[], r: number) => (
          <View key={r}>
            {roundCount > 1 ? (
              <Text
                style={{
                  color: colors.fgMuted,
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                  marginTop: r > 0 ? 8 : 0,
                }}
              >
                {(translate('migrationsplitplan.round') as string)
                  .replace('{n}', String(r + 1))
                  .replace('{r}', String(roundCount))}
              </Text>
            ) : null}
            {round.map((tx: RPCSplitTxType, i: number) => {
              txNumber += 1;
              return (
                <Card key={i} colors={colors}>
                  <Text
                    style={{
                      color: colors.fgDefault,
                      fontSize: 15,
                      fontWeight: '700',
                      paddingVertical: 4,
                    }}
                  >
                    {(translate('migrationsplitplan.tx') as string).replace(
                      '{n}',
                      String(txNumber),
                    )}
                  </Text>
                  {/* Count and sum only: the note denominations are the
                      split's implementation detail, not the consent surface. */}
                  <Row
                    label={translate('migrationsplitplan.outputs') as string}
                    value={String(tx.outputs.length)}
                    colors={colors}
                  />
                  <Row
                    label={translate('migrationsplitplan.amount') as string}
                    value={zec(tx.outputs.reduce((sum, v) => sum + v, 0))}
                    colors={colors}
                  />
                  <Row
                    label={translate('migrationsplitplan.fee') as string}
                    value={zec(tx.fee)}
                    colors={colors}
                  />
                </Card>
              );
            })}
          </View>
        ))}

        {/* Totals: the whole migration's cost, not just this phase's. Consent
            covers both phases, so the later per-batch sending fee and any
            stranded value are disclosed here. */}
        <Card colors={colors}>
          <Row
            label={translate('migrationsplitplan.total') as string}
            value={totalSummary}
            colors={colors}
            bold={true}
          />
          <Row
            label={translate('migrationsplitplan.sending-fee') as string}
            value={zec(plan?.parts_fee ?? 0)}
            colors={colors}
          />
          {(plan?.residual ?? 0) > 0 ? (
            <Row
              label={translate('migrationsplitplan.stranded') as string}
              value={zec(plan?.residual ?? 0)}
              colors={colors}
            />
          ) : null}
          <Row
            label={translate('migrationsplitplan.confirm-in') as string}
            value={confirmInValue}
            colors={colors}
          />
        </Card>
        {(plan?.residual ?? 0) > 0 ? (
          <Text
            style={{
              color: colors.fgMuted,
              fontSize: 13,
              lineHeight: 19,
              marginBottom: 10,
            }}
          >
            {translate('migrationsplitplan.stranded-note') as string}
          </Text>
        ) : null}

        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {translate('migrationsplitplan.footnote') as string}
        </Text>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingTop: 24,
          paddingBottom: 24,
          paddingHorizontal: 24,
        }}
      >
        <Button
          testID="migrationsplitplan.back"
          type={ButtonTypeEnum.Ghost}
          title={translate('migrationsplitplan.back') as string}
          onPress={() => navigation.goBack()}
          twoButtons={true}
        />
        <Button
          testID="migrationsplitplan.accept"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationsplitplan.accept') as string}
          onPress={onAccept}
          twoButtons={true}
          disabled={!plan}
        />
      </View>
    </View>
  );
};

export default MigrationSplitPlan;
