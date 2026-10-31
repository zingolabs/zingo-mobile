/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';

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
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';

type LaunchingProps = {
  translate: (key: string) => TranslateType;
  firstLaunchingMessage: LaunchingModeEnum;
  biometricGate: BiometricGateOutcome;
  tryAgain?: () => void;
};

const Launching: React.FunctionComponent<LaunchingProps> = props => {
  const biometricsFailed = props.biometricGate.kind === 'declined';
  const updating =
    props.firstLaunchingMessage === LaunchingModeEnum.updating &&
    !biometricsFailed;
  const message =
    props.biometricGate.kind === 'declined'
      ? Utils.renderGateFailure(props.biometricGate.failure, props.translate)
      : undefined;
  const { colors } = useTheme();
  const bottomPad = useBottomActionPad();
  const { edges, fades } = useScrollEdges();

  /**
   * The name sits over the first 40 of the screen and the message under it,
   * while they fit; past that the content scrolls, and Try again stays below
   * it at the one bottom distance.
   */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
    >
      <ScrollView
        {...edges}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
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
            flexGrow: 4,
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
            flexGrow: 6,
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
            </>
          ) : (
            /** Keeps the room so the logo does not jump; hidden from screen
             * readers while it is invisible. */
            <View
              style={{ alignSelf: 'stretch', alignItems: 'center' }}
              importantForAccessibility={
                updating ? 'auto' : 'no-hide-descendants'
              }
              accessibilityElementsHidden={!updating}
            >
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
                  opacity: updating ? 1 : 0,
                  textAlign: 'center',
                }}
                selectable={updating}
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
                  opacity: updating ? 1 : 0,
                  textAlign: 'center',
                }}
                selectable={updating}
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
                  opacity: updating ? 1 : 0,
                  textAlign: 'center',
                }}
                selectable={updating}
              >
                {
                  props.translate(
                    'updating.firstlaunchingmessage-footer',
                  ) as string
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      {fades}
      {biometricsFailed && (
        <View
          style={{
            paddingHorizontal: space20,
            paddingTop: space8,
            paddingBottom: bottomPad,
          }}
        >
          <Button
            variant="primary"
            title={props.translate('biometricsfailed-button') as string}
            onPress={() => props.tryAgain && props.tryAgain()}
          />
        </View>
      )}
    </View>
  );
};

export default Launching;
