/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';
import {
  planIronwoodMigration,
  routeStartMigration,
  startIronwoodMigration,
} from '../../app/walletBackend';
import {
  RPCMigrationPlanType,
  RPCSplitTxType,
} from '../../app/walletBackend/types/RPCMigrationPlanType';

type MigrationSplitPlanProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSplitPlan
>;

const ZATS_PER_ZEC = 10 ** 8;

// Collapse repeated same-value notes into distinct {value, count} groups,
// preserving first-appearance order, so a card renders "10 (×3)" instead of
// the same amount many times.
const groupValues = (values: number[]): { value: number; count: number }[] => {
  const groups: { value: number; count: number }[] = [];
  for (const v of values) {
    const existing = groups.find(g => g.value === v);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({ value: v, count: 1 });
    }
  }
  return groups;
};

// A label/value line inside a bordered card.
const Row: React.FunctionComponent<{
  label: string;
  value: React.ReactNode;
  colors: ThemeType['colors'];
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
    <Text style={{ color: colors.placeholder, fontSize: 14, marginRight: 12 }}>
      {label}
    </Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
      {typeof value === 'string' ? (
        <Text
          style={{
            color: colors.text,
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
  colors: ThemeType['colors'];
  children: React.ReactNode;
}> = ({ colors, children }) => (
  <View
    style={{
      borderWidth: 1,
      borderColor: colors.bottomSheetBorder,
      backgroundColor: colors.bottomSheetBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 14,
    }}
  >
    {children}
  </View>
);

// The consent screen of the private migration: renders the exact note-
// splitting plan (plus the fees and stranded value the whole migration
// implies) and, on Accept, records consent to its hash. Nothing is signed or
// broadcast here; MigrationSplitting drives the rounds afterwards.
const MigrationSplitPlan: React.FunctionComponent<MigrationSplitPlanProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const [plan, setPlan] = useState<RPCMigrationPlanType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Distinguishes "couldn't plan" from "couldn't start" in the error title.
  const [errorOnStart, setErrorOnStart] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);

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
    setErrorOnStart(false);
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

  // Accept = consent: bind the user's approval to the exact plan hash they
  // were shown. The ZIP 318 schedule draws the broadcast cadence itself.
  const onAccept = useCallback(async () => {
    if (!plan?.plan_hash || starting) {
      return;
    }
    setStarting(true);
    const start = await startIronwoodMigration(plan.plan_hash);
    setStarting(false);
    const route = routeStartMigration(start);
    switch (route.kind) {
      case 'proceed':
        navigation.navigate(RouteEnum.MigrationSplitting, { plan });
        return;
      // A migration already exists (e.g. re-entry after a kill between
      // consent and splitting): resume it instead of erroring.
      case 'resume':
        navigation.navigate(RouteEnum.MigrationSplitting, {});
        return;
      // ConsentStale: the wallet's notes changed between planning and
      // consent. Replan and let the user review the fresh plan.
      case 'replan':
        addLastSnackbar(translate('migrationsplitplan.replanned') as string);
        fetchPlan();
        return;
      case 'error':
        setErrorOnStart(true);
        setErrorMsg(route.message);
    }
  }, [plan, starting, navigation, addLastSnackbar, translate, fetchPlan]);

  const splitRounds = plan?.split_rounds ?? [];
  const roundCount = splitRounds.length;
  const txCount = splitRounds.reduce((sum, round) => sum + round.length, 0);
  const noteCount = plan?.parts?.length ?? 0;
  const isEmpty = !loading && !errorMsg && txCount === 0 && noteCount === 0;

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
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            color: colors.placeholder,
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {
                translate(
                  errorOnStart
                    ? 'migrationsplitplan.start-error-title'
                    : 'migrationsplitplan.error-title',
                ) as string
              }
            </Text>
            <Text
              style={{
                color: colors.placeholder,
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

  // ----- Nothing to migrate -----
  if (isEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 40, flexGrow: 1 }}
        >
          {title}
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.text,
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
                color: colors.placeholder,
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            color: colors.placeholder,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: roundCount > 1 ? 10 : 24,
          }}
        >
          {subtitle.split('**').map((part: string, i: number) =>
            i % 2 === 1 ? (
              <Text key={i} style={{ color: colors.text, fontWeight: '700' }}>
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
              color: colors.placeholder,
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
                  color: colors.placeholder,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 8,
                  marginTop: r > 0 ? 8 : 0,
                }}
              >
                {(translate('migrationsplitplan.round') as string)
                  .replace('{n}', String(r + 1))
                  .replace('{r}', String(roundCount))
                  .toUpperCase()}
              </Text>
            ) : null}
            {round.map((tx: RPCSplitTxType, i: number) => {
              txNumber += 1;
              return (
                <Card key={i} colors={colors}>
                  <Row
                    label={(
                      translate('migrationsplitplan.tx') as string
                    ).replace('{n}', String(txNumber))}
                    value={
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: '700',
                        }}
                      >
                        {translate('migrationsplitplan.flow') as string}
                      </Text>
                    }
                    colors={colors}
                  />
                  <Row
                    label={`${
                      translate('migrationsplitplan.outputs') as string
                    } (${tx.outputs.length})`}
                    value={groupValues(tx.outputs)
                      .map(g =>
                        g.count > 1
                          ? `${zec(g.value)} (×${g.count})`
                          : zec(g.value),
                      )
                      .join(', ')}
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
              label={translate('migrationsplitplan.residual') as string}
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
              color: colors.placeholder,
              fontSize: 13,
              lineHeight: 19,
              marginBottom: 10,
            }}
          >
            {translate('migrationsplitplan.residual-note') as string}
          </Text>
        ) : null}

        <Text
          style={{
            color: colors.placeholder,
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
          disabled={starting}
        />
      </View>
    </View>
  );
};

export default MigrationSplitPlan;
