/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import StepperHeader from '../Migration/StepperHeader';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, GlobalConst, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';
import { migrationStatus } from '../../app/walletBackend';
import {
  RPCMigrationStatusType,
  RPCWakePointType,
} from '../../app/walletBackend/types/RPCMigrationStatusType';
import {
  armBatchReminders,
  requestReminderPermission,
} from '../../app/notifications/reminders';

type MigrationScheduleProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationSchedule
>;

const ZATS_PER_ZEC = 10 ** 8;

const fmt = (zats: number): string =>
  `${parseFloat((zats / ZATS_PER_ZEC).toFixed(4))}`;

// The schedule review: one card per coming window with its batch (the
// denominations due) and when the reminder will fire. Confirm asks for
// notification permission and arms one reminder per window at its random
// target time — nothing is ever sent without the user opening the app.
const MigrationSchedule: React.FunctionComponent<MigrationScheduleProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const [status, setStatus] = useState<RPCMigrationStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);

  // The cadence chooser just called reschedule_parts, which re-bucketed with
  // fresh randomization — so this fetch, after it, is the schedule's truth.
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

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  const wakes = useMemo(() => status?.next_wakes ?? [], [status]);

  const onConfirm = useCallback(async () => {
    if (confirming) {
      return;
    }
    setConfirming(true);
    const granted = await requestReminderPermission();
    if (granted) {
      await armBatchReminders(
        wakes.map((wake: RPCWakePointType, i: number) => ({
          id: String(wake.bucket_index),
          timestampMs: wake.estimated_target_unix_time * 1000,
          title: (
            translate('migrationschedule.reminder-title') as string
          ).replace('{n}', String(i + 1)),
          body: translate('migrationschedule.reminder-body') as string,
        })),
      );
      addLastSnackbar(translate('migrationschedule.armed') as string);
    } else {
      // Without permission no reminder can fire; the home banner remains the
      // way back in, so say so instead of failing.
      addLastSnackbar(translate('migrationschedule.denied') as string);
    }
    setConfirming(false);
    goHome();
  }, [confirming, wakes, translate, addLastSnackbar, goHome]);

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
        <BoldText style={{ fontSize: 22, marginBottom: 10 }}>
          {translate('migrationschedule.title') as string}
        </BoldText>
        <Text
          style={{
            color: colors.placeholder,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 20,
          }}
        >
          {(translate('migrationschedule.intro') as string)
            .split('**')
            .map((part: string, i: number) =>
              i % 2 === 1 ? (
                <Text key={i} style={{ color: colors.text, fontWeight: '700' }}>
                  {part}
                </Text>
              ) : (
                <Text key={i}>{part}</Text>
              ),
            )}
        </Text>

        {wakes.map((wake: RPCWakePointType, i: number) => (
          <View
            key={wake.bucket_index}
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
                {(translate('migrationschedule.batch') as string).replace(
                  '{n}',
                  String(i + 1),
                )}
              </Text>
              {/* Wall-clock time leads; block heights are the metadata. */}
              <Text
                style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}
              >
                {(translate('migrationschedule.due') as string).replace(
                  '{time}',
                  Utils.formatDate(
                    wake.estimated_target_unix_time * 1000,
                    'EEE, MMM d · HH:mm',
                    language,
                  ),
                )}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              {wake.denominations.map((denomination: number, d: number) => (
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
            <Text
              style={{
                color: colors.placeholder,
                fontSize: 12,
                fontStyle: 'italic',
              }}
            >
              {(translate('migrationschedule.tech-line') as string)
                .replace('{anchor}', String(wake.boundary))
                .replace('{window}', String(wake.bucket_index))}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingVertical: 24,
          paddingHorizontal: 24,
          backgroundColor: '#050610',
          borderTopColor: '#202240',
          borderTopWidth: 1,
        }}
      >
        <Button
          testID="migrationschedule.back"
          type={ButtonTypeEnum.Ghost}
          title={translate('migrationschedule.back') as string}
          onPress={() => navigation.goBack()}
          twoButtons={true}
        />
        <Button
          testID="migrationschedule.confirm"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationschedule.confirm') as string}
          onPress={onConfirm}
          twoButtons={true}
          disabled={confirming}
        />
      </View>
    </View>
  );
};

export default MigrationSchedule;
