/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

import { space8, space20, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';

import {
  BiometricGateOutcome,
  LaunchingModeEnum,
  TranslateType,
} from '@app/AppState';
import Button from '@ui/primitives/Button';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import Utils from '@app/utils';

type LaunchingProps = {
  translate: (key: string) => TranslateType;
  firstLaunchingMessage: LaunchingModeEnum;
  biometricGate: BiometricGateOutcome;
  tryAgain?: () => void;
};

const Launching: React.FunctionComponent<LaunchingProps> = props => {
  const biometricsFailed = props.biometricGate.kind === 'declined';
  const message =
    props.biometricGate.kind === 'declined'
      ? Utils.renderGateFailure(props.biometricGate.failure, props.translate)
      : undefined;
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space20,
        }}
      >
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            alignSelf: 'stretch',
            height: '40%',
            marginTop: space20,
          }}
        >
          <Text variant="balance" tone="muted">
            {getZingoName()}
          </Text>
          <Text variant="caption" tone="muted">
            {getZingoVersion()}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            alignSelf: 'stretch',
            height: '60%',
            marginTop: space20,
          }}
        >
          {!!message && (
            <Text
              variant="body"
              tone="muted"
              style={{ marginTop: space8, textAlign: 'center' }}
              selectable
            >
              {message}
            </Text>
          )}
          {biometricsFailed ? (
            <>
              <Text
                variant="subtitle"
                style={{
                  marginTop: space8,
                  textAlign: 'center',
                }}
                selectable
              >
                {props.translate('biometricsfailed-title') as string}
              </Text>
              <Text
                variant="body"
                style={{
                  marginTop: space8,
                  textAlign: 'center',
                }}
                selectable
              >
                {props.translate('biometricsfailed-body') as string}
              </Text>
              <Text
                variant="body"
                style={{
                  marginTop: space8,
                  marginBottom: space8,
                  textAlign: 'center',
                }}
                selectable
              >
                {props.translate('biometricsfailed-footer') as string}
              </Text>
              <Button
                variant="primary"
                title={props.translate('biometricsfailed-button') as string}
                onPress={() => props.tryAgain && props.tryAgain()}
                style={{ marginVertical: space8 }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator
                size="large"
                color={
                  props.firstLaunchingMessage === LaunchingModeEnum.updating
                    ? colors.fgMuted
                    : 'transparent'
                }
              />
              <Text
                variant="subtitle"
                style={{
                  marginTop: space8,
                  opacity:
                    props.firstLaunchingMessage ===
                      LaunchingModeEnum.updating && !biometricsFailed
                      ? 1
                      : 0,
                  textAlign: 'center',
                }}
                selectable
              >
                {
                  props.translate(
                    'updating.firstlaunchingmessage-title',
                  ) as string
                }
              </Text>
              <Text
                variant="body"
                style={{
                  marginTop: space8,
                  opacity:
                    props.firstLaunchingMessage ===
                      LaunchingModeEnum.updating && !biometricsFailed
                      ? 1
                      : 0,
                  textAlign: 'center',
                }}
                selectable
              >
                {
                  props.translate(
                    'updating.firstlaunchingmessage-body',
                  ) as string
                }
              </Text>
              <Text
                variant="body"
                style={{
                  marginTop: space8,
                  marginBottom: space8,
                  opacity:
                    props.firstLaunchingMessage ===
                      LaunchingModeEnum.updating && !biometricsFailed
                      ? 1
                      : 0,
                  textAlign: 'center',
                }}
                selectable
              >
                {
                  props.translate(
                    'updating.firstlaunchingmessage-footer',
                  ) as string
                }
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default Launching;
