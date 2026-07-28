/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';
import { planOrchardDrain } from '../../app/walletBackend';
import { RPCDrainPlanType } from '../../app/walletBackend/types/RPCDrainPlanType';

type MigrationTransactionsProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationTransactions
>;

const ZATS_PER_ZEC = 10 ** 8;

// Collapse repeated same-value notes into distinct {value, count} groups,
// preserving first-appearance order, so a fragmented wallet renders "10 (×3)"
// instead of the same amount many times.
const groupInputs = (inputs: number[]): { value: number; count: number }[] => {
  const groups: { value: number; count: number }[] = [];
  for (const v of inputs) {
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

const MigrationTransactions: React.FunctionComponent<
  MigrationTransactionsProps
> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info } = context;
  const { colors } = useTheme() as ThemeType;

  const [plan, setPlan] = useState<RPCDrainPlanType | null>(null);
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

  // Fetch the drain plan on mount. Pure preview: nothing is broadcast here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const planResult = await planOrchardDrain();
      if (cancelled) {
        return;
      }
      if (!planResult.ok) {
        setErrorMsg(planResult.error.message);
        setLoading(false);
        return;
      }
      try {
        const parsed: RPCDrainPlanType = JSON.parse(planResult.value);
        if (parsed.error) {
          setErrorMsg(parsed.error);
        } else {
          setPlan(parsed);
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

  // Accepting hands off to the dedicated sending screen, which owns the
  // broadcast and its live progress. We pass the previewed transactions so its
  // list matches exactly what the user just approved.
  const onAccept = useCallback(() => {
    navigation.navigate(RouteEnum.MigrationSending, {
      transactions: plan?.transactions ?? [],
    });
  }, [navigation, plan]);

  const transactions = plan?.transactions ?? [];
  const txCount = transactions.length;
  const noteCount = transactions.reduce((sum, tx) => sum + tx.inputs.length, 0);
  const isEmpty = !loading && !errorMsg && txCount === 0;

  const title = (
    <BoldText style={{ fontSize: 22, textAlign: 'center', marginBottom: 8 }}>
      {translate('migrationtransactions.title') as string}
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
          {translate('migrationtransactions.loading') as string}
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
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
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
              {translate('migrationtransactions.error-title') as string}
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
            title={translate('migrationtransactions.back') as string}
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
              {translate('migrationtransactions.nothing-title') as string}
            </Text>
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {translate('migrationtransactions.nothing-body') as string}
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
            title={translate('migrationtransactions.close') as string}
            onPress={goHome}
          />
        </View>
      </View>
    );
  }

  // ----- Loaded plan -----
  const subtitleKey =
    txCount === 1
      ? 'migrationtransactions.subtitle-one'
      : 'migrationtransactions.subtitle';
  const subtitle = (translate(subtitleKey) as string).replace(
    '{count}',
    String(txCount),
  );
  const noteWord = translate(
    noteCount === 1
      ? 'migrationtransactions.note-one'
      : 'migrationtransactions.notes',
  ) as string;
  const txWord = translate(
    txCount === 1
      ? 'migrationtransactions.tx-one'
      : 'migrationtransactions.txs',
  ) as string;
  const feeSuffix = translate('migrationtransactions.fee-suffix') as string;
  const totalSummary = `${noteCount} ${noteWord} · ${txCount} ${txWord} · ${zec(
    plan?.fee ?? 0,
  )} ${feeSuffix}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 24,
        }}
      >
        {title}
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
            marginBottom: 24,
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

        {transactions.map((tx, i) => (
          <Card key={i} colors={colors}>
            <Row
              label={(translate('migrationtransactions.tx') as string).replace(
                '{n}',
                String(i + 1),
              )}
              value={
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {translate('migrationtransactions.flow') as string}
                </Text>
              }
              colors={colors}
            />
            <Row
              label={`${
                translate('migrationtransactions.inputs') as string
              } (${tx.inputs.length})`}
              value={groupInputs(tx.inputs)
                .map(g =>
                  g.count > 1 ? `${zec(g.value)} (×${g.count})` : zec(g.value),
                )
                .join(', ')}
              colors={colors}
            />
            <Row
              label={translate('migrationtransactions.output') as string}
              value={zec(tx.output)}
              colors={colors}
            />
            <Row
              label={translate('migrationtransactions.fee') as string}
              value={zec(tx.fee)}
              colors={colors}
            />
          </Card>
        ))}

        {/* Totals */}
        <Card colors={colors}>
          <Row
            label={translate('migrationtransactions.total') as string}
            value={totalSummary}
            colors={colors}
            bold={true}
          />
          <Row
            label={translate('migrationtransactions.confirm-in') as string}
            value={
              translate('migrationtransactions.confirm-in-value') as string
            }
            colors={colors}
          />
        </Card>
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
          testID="migrationtransactions.back"
          type={ButtonTypeEnum.Ghost}
          title={translate('migrationtransactions.back') as string}
          onPress={() => navigation.goBack()}
          twoButtons={true}
        />
        <Button
          testID="migrationtransactions.accept"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationtransactions.accept') as string}
          onPress={onAccept}
          twoButtons={true}
        />
      </View>
    </View>
  );
};

export default MigrationTransactions;
