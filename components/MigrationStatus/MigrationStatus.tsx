/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import { migrationStatus } from '../../app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCWakePointType,
} from '../../app/walletBackend/types/RPCMigrationStatusType';

type MigrationStatusProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationStatus
>;

const ZATS_PER_ZEC = 10 ** 8;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// The private path's "home" while a migration is in flight: the landing after
// the schedule is confirmed, and where the parts_scheduled banner resumes to.
// It only reads migrationStatus — nothing is broadcast here. Each window is a
// batch the user sends when its boundary opens; reminders never send for them.
const MigrationStatus: React.FunctionComponent<MigrationStatusProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, info } = context;
  const { colors } = useTheme() as ThemeType;

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Re-read on every focus: the phase advances while the user is away (parts
  // confirm, windows open), so a status screen must reflect the live truth.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const statusResult = await migrationStatus();
        if (cancelled) {
          return;
        }
        if (!statusResult.ok) {
          setErrorMsg(statusResult.error.message);
          setLoading(false);
          return;
        }
        try {
          const parsed = JSON.parse(
            statusResult.value,
          ) as RPCMigrationStatusType;
          if (parsed.error) {
            setErrorMsg(parsed.error);
          } else {
            setStatus(parsed);
            setErrorMsg(null);
          }
        } catch (e) {
          setErrorMsg(`${e}`);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

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

  const wakes: RPCWakePointType[] = status?.upcoming_windows ?? [];
  // The ZIP 318 schedule draws each part its own window, so progress counts
  // parts directly.
  const partsTotal = status?.parts_total ?? 0;
  const partsConfirmed = status?.parts_confirmed ?? 0;
  const bucketModulus = status?.bucket_modulus ?? 144;
  const height = info?.latestBlock ?? 0;

  const batchesTotal = Math.max(1, partsTotal);
  const batchesConfirmed = Math.min(batchesTotal, partsConfirmed);
  const valueTotal = status?.value_total ?? 0;
  const pct =
    valueTotal > 0
      ? Math.round(((status?.value_migrated ?? 0) / valueTotal) * 100)
      : 0;

  const nextWake = wakes[0];
  // The batch to send right now: the window the chain is currently inside,
  // reported by the backend. next_wakes lists only future windows and cannot
  // carry this one, so the Send action reads it from here. Null means a tap
  // would broadcast nothing, so the action stays hidden.
  const dueNow = status?.due_now ?? null;

  // One card per visible batch: the open one (dueNow) first, then the upcoming
  // scheduled windows. Batch numbers continue from the confirmed count so
  // "Batch 3" means the same here as on the plan screen.
  const nextWakeBase = batchesConfirmed + (dueNow ? 2 : 1);
  const batchCards = [
    ...(dueNow
      ? [
          {
            key: 'due',
            n: batchesConfirmed + 1,
            denominations: dueNow.denominations,
            anchor: dueNow.boundary,
            open: true,
          },
        ]
      : []),
    ...wakes.map((wake, i) => ({
      key: `w${wake.bucket_index}`,
      n: nextWakeBase + i,
      denominations: wake.denominations,
      anchor: wake.boundary,
      open: false,
    })),
  ];

  const progressLine = (translate('migrationstatus.progress') as string)
    .replace('{confirmed}', String(batchesConfirmed))
    .replace('{total}', String(batchesTotal))
    .replace('{pct}', String(pct));

  // The info box: the "**…**"-wrapped boundary is emphasized, so one string
  // keeps its natural word order across locales.
  const nextLine = dueNow
    ? (translate('migrationstatus.next-open-now') as string).replace(
        '{n}',
        String(batchesConfirmed + 1),
      )
    : nextWake
      ? (translate('migrationstatus.next-opens') as string)
          .replace('{boundary}', String(nextWake.boundary))
          .replace('{height}', String(height))
      : (translate('migrationstatus.all-sent') as string);
  const remindersLine = (
    translate('migrationstatus.reminders') as string
  ).replace('{n}', String(wakes.length));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StepperHeader splitDone={true} sendActive={true} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <BoldText style={{ fontSize: 22, marginBottom: 14 }}>
          {translate('migrationstatus.title') as string}
        </BoldText>

        {/* Progress bar + line */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.bottomSheetBorder,
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 3,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 15,
            marginBottom: 20,
          }}
        >
          {progressLine}
        </Text>

        {/* Next-batch info box */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bottomSheetBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: colors.placeholder, fontSize: 14, lineHeight: 21 }}>
            {nextLine.split('**').map((part: string, i: number) =>
              i % 2 === 1 ? (
                <Text key={i} style={{ color: colors.text, fontWeight: '700' }}>
                  {part}
                </Text>
              ) : (
                <Text key={i}>{part}</Text>
              ),
            )}
          </Text>
          {wakes.length > 0 && (
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {remindersLine}
            </Text>
          )}
        </View>

        {/* One card per batch: the open one (dueNow) first, then upcoming. */}
        {batchCards.map(card => {
          const open = card.open;
          return (
            <View
              key={card.key}
              style={{
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
                backgroundColor: colors.bottomSheetBackground,
                borderRadius: 14,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}
                >
                  {(translate('migrationstatus.batch') as string).replace(
                    '{n}',
                    String(card.n),
                  )}
                </Text>
                {/* SCHEDULED until the window opens, then OPEN in the accent. */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: open ? colors.primary : colors.bottomSheetBorder,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: open ? colors.primary : colors.placeholder,
                      fontSize: 12,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                    }}
                  >
                    {open
                      ? (translate('migrationstatus.open') as string)
                      : (translate('migrationstatus.scheduled') as string)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                {card.denominations.map((denomination: number, d: number) => (
                  <View
                    key={d}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.bottomSheetBorder,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {fmt(denomination)}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Wall-clock is irrelevant here; the batch is gated by height. */}
              <Text
                style={{
                  color: colors.placeholder,
                  fontSize: 12,
                  fontStyle: 'italic',
                }}
              >
                {(translate('migrationstatus.tech-line') as string)
                  .replace('{anchor}', String(card.anchor))
                  .replace('{sendby}', String(card.anchor + bucketModulus))}
              </Text>
            </View>
          );
        })}

        <Text
          style={{
            color: colors.placeholder,
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
          }}
        >
          {translate('migrationstatus.footer') as string}
        </Text>
      </ScrollView>

      {dueNow ? (
        // A batch is due: sending it is the primary action, Back is demoted.
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
            testID="migrationstatus.home"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationstatus.back') as string}
            onPress={goHome}
            twoButtons={true}
          />
          <Button
            testID="migrationstatus.send"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstatus.send') as string}
            onPress={() =>
              navigation.navigate(RouteEnum.MigrationBatchSending, {
                denominations: dueNow.denominations,
              })
            }
            twoButtons={true}
          />
        </View>
      ) : (
        <View
          style={{
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <Button
            testID="migrationstatus.home"
            type={ButtonTypeEnum.Primary}
            title={translate('migrationstatus.back') as string}
            onPress={goHome}
          />
        </View>
      )}
    </View>
  );
};

export default MigrationStatus;
