/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@app/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import { AppDrawerParamList } from '@app/types';
import { AppTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { ButtonTypeEnum, RouteEnum } from '@app/AppState';
import Utils from '@app/utils';
import { planOrchardDrain } from '@app/walletBackend';
import { RPCDrainPlanType } from '@app/walletBackend/types/RPCDrainPlanType';

type MigrationTransactionsProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationTransactions
>;

const ZATS_PER_ZEC = 10 ** 8;

// A label/value line inside a bordered card. `bold` emphasizes the whole
// line: full text colour on both sides, not just the value.
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
      paddingVertical: 4,
    }}
  >
    <Text
      style={{
        color: bold ? colors.fgDefault : colors.fgMuted,
        fontSize: 14,
        fontWeight: bold ? '700' : '400',
        marginRight: 12,
      }}
    >
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

// The transaction cards sit a shade darker than the summary, so the summary
// reads as the surface and the detail recedes.
const TX_CARD_BACKGROUND = '#020D1C';

const Card: React.FunctionComponent<{
  colors: AppTheme['colors'];
  background?: string;
  children: React.ReactNode;
}> = ({ colors, background, children }) => (
  <View
    style={{
      borderWidth: 1,
      borderColor: colors.bottomSheetBorder,
      backgroundColor: background ?? colors.bgSurface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
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
  const { translate, info, totalBalance } = context;
  const { colors } = useTheme();

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

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const planResult = await planOrchardDrain();
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
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

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
  const orchardHeld = totalBalance ? totalBalance.confirmedOrchardBalance : 0;
  const noPlan = !loading && !errorMsg && txCount === 0;
  const isPending = noPlan && (plan?.residual ?? 0) === 0 && orchardHeld > 0;
  const isEmpty = noPlan && !isPending;

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
          {translate('migrationtransactions.loading') as string}
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
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
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
              {translate('migrationtransactions.error-title') as string}
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
              {translate('migrationtransactions.pending-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {translate('migrationtransactions.pending-body') as string}
            </Text>
          </View>
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
            testID="migrationtransactions.pending-back"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationtransactions.back') as string}
            onPress={() => navigation.goBack()}
            twoButtons={true}
          />
          <Button
            testID="migrationtransactions.retry"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationtransactions.retry') as string}
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
              {translate('migrationtransactions.nothing-title') as string}
            </Text>
            <Text
              style={{
                color: colors.fgMuted,
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
  const totalOutput = transactions.reduce((sum, tx) => sum + tx.output, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
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
            color: colors.fgMuted,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
            marginBottom: 24,
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

        {/* Summary first: totals up top, one fact per row, then the
            per-transaction detail. The fee leads — it's the consent number. */}
        <Card colors={colors}>
          <Row
            label={translate('migrationtransactions.total-fee') as string}
            value={zec(plan?.fee ?? 0)}
            colors={colors}
            bold={true}
          />
          <Row
            label={translate('migrationtransactions.total-txs') as string}
            value={String(txCount)}
            colors={colors}
          />
          <Row
            label={translate('migrationtransactions.total-notes') as string}
            value={String(noteCount)}
            colors={colors}
          />
          <Row
            label={translate('migrationtransactions.total-amount') as string}
            value={zec(totalOutput)}
            colors={colors}
          />
          <Row
            label={translate('migrationtransactions.confirm-in') as string}
            value={
              translate('migrationtransactions.confirm-in-value') as string
            }
            colors={colors}
          />
        </Card>

        <View
          style={{
            height: 1,
            backgroundColor: colors.bottomSheetBorder,
            marginBottom: 14,
          }}
        />

        {transactions.map((tx, i) => (
          <Card key={i} colors={colors} background={TX_CARD_BACKGROUND}>
            <Text
              style={{
                color: colors.fgDefault,
                fontSize: 15,
                fontWeight: '700',
                paddingVertical: 4,
              }}
            >
              {(translate('migrationtransactions.tx') as string).replace(
                '{n}',
                String(i + 1),
              )}
            </Text>
            {/* Just the note count: the amounts are standardized by the split,
                and Output/Fee already carry the sums. */}
            <Row
              label={translate('migrationtransactions.inputs') as string}
              value={String(tx.inputs.length)}
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
