/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme, slopFor } from '@app/theme';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import {
  Route,
  ServerType,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import NetInfoType from '@app/AppState/types/NetInfoType';
import {
  MixnetView,
  viewPhase,
} from '@app/walletBackend/transforms/mixnetView';
import FadeText from '@ui/primitives/FadeText';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';
import PrivacyToggle from './PrivacyToggle';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { PlayIcon } from '@ui/primitives/Icons/PlayIcon';
import { WifiIcon } from '@ui/primitives/Icons/WifiIcon';
import { CloudDownloadIcon } from '@ui/primitives/Icons/CloudDownloadIcon';

type SyncStatusBarProps = {
  noSyncingStatus: boolean | undefined;
  server: ServerType;
  netInfo: NetInfoType;
  percentageOutputsScanned: number;
  syncInProgress: boolean;
  viewSyncStatus: boolean;
  opacityValue: Animated.Value;
  mixnetView: MixnetView;
  translate: (key: string) => TranslateType;
  privacy: boolean;
  noPrivacy: boolean | undefined;
  setPrivacyOption: ((value: boolean) => Promise<void>) | undefined;
  addLastSnackbar:
    ((msg: string, duration?: SnackbarDurationEnum) => void) | undefined;
  noBalance: boolean | undefined;
};

const SyncStatusBar: React.FC<SyncStatusBarProps> = React.memo(
  ({
    noSyncingStatus,
    server,
    netInfo,
    percentageOutputsScanned,
    syncInProgress,
    viewSyncStatus,
    opacityValue,
    mixnetView,
    translate,
    privacy,
    noPrivacy,
    setPrivacyOption,
    addLastSnackbar,
    noBalance,
  }) => {
    const navigation = useNavigation<WalletNavigation>();
    const { colors } = useTheme();
    const phase = viewPhase(mixnetView);

    return (
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 12,
          marginHorizontal: 5,
          gap: 8,
        }}
      >
        {!noSyncingStatus && server.kind !== 'offline' && (
          <View
            style={{
              minHeight: 29,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
            }}
          >
            {netInfo.isConnected && !(percentageOutputsScanned === 0) ? (
              <>
                {!syncInProgress && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 1,
                      borderColor: colors.borderAccent,
                      borderWidth: 1,
                      borderRadius: 10,
                      minWidth: 25,
                      minHeight: 25,
                    }}
                  >
                    <View
                      testID="header.checkicon"
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 3,
                      }}
                    >
                      <CheckIcon color={colors.fgAccent} size={16} />
                      {viewSyncStatus && (
                        <FadeText style={{ fontSize: 12, marginLeft: 2 }}>
                          {translate('synced') as string}
                        </FadeText>
                      )}
                    </View>
                  </View>
                )}
                {syncInProgress && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 1,
                      borderColor: colors.borderSyncing,
                      borderWidth: 1,
                      borderRadius: 10,
                      minWidth: 25,
                      minHeight: 25,
                    }}
                  >
                    <Animated.View
                      style={{
                        opacity: opacityValue,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 3,
                      }}
                    >
                      <TouchableOpacity
                        testID="header.playicon"
                        onPress={() => {
                          navigation.navigate(Route.SyncReport);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <PlayIcon color={colors.fgSyncing} size={16} />
                          {viewSyncStatus && (
                            <FadeText style={{ fontSize: 12, marginLeft: 2 }}>
                              {translate('syncing') as string}
                            </FadeText>
                          )}
                          {viewSyncStatus && percentageOutputsScanned > 0 && (
                            <FadeText style={{ fontSize: 12, marginLeft: 2 }}>
                              {' - '}
                            </FadeText>
                          )}
                          {percentageOutputsScanned > 0 && (
                            <FadeText
                              style={{ fontSize: 12, marginLeft: 2 }}
                            >{` ${percentageOutputsScanned}%`}</FadeText>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                )}
              </>
            ) : (
              <>
                {netInfo.isConnected && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 1,
                      borderColor: colors.borderAccentDisabled,
                      borderWidth: 1,
                      borderRadius: 10,
                      minWidth: 25,
                      minHeight: 25,
                    }}
                  >
                    <TouchableOpacity
                      hitSlop={slopFor(16)}
                      onPress={() => {
                        navigation.navigate(Route.SyncReport);
                      }}
                    >
                      <View
                        testID="header.wifiicon"
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: 3,
                        }}
                      >
                        <WifiIcon color={colors.fgAccentDisabled} size={16} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            {(!netInfo.isConnected ||
              netInfo.type === NetInfoStateType.cellular ||
              netInfo.isConnectionExpensive) && (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 25,
                  minHeight: 25,
                }}
              >
                <TouchableOpacity
                  hitSlop={slopFor(16)}
                  onPress={() => {
                    navigation.navigate(Route.SyncReport);
                  }}
                >
                  <CloudDownloadIcon
                    color={
                      !netInfo.isConnected ? colors.fgDanger : colors.fgSyncing
                    }
                    size={16}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {server.kind === 'offline' && (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0,
              marginHorizontal: 2.5,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderColor: colors.borderMuted,
              borderWidth: 1,
              borderRadius: 10,
              minWidth: 25,
              minHeight: 25,
            }}
          >
            <View
              testID="header.offlineicon"
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 3,
              }}
            >
              <WifiIcon color={colors.fgDanger} size={16} />
              <FadeText style={{ fontSize: 12, marginLeft: 2 }}>
                {translate('settings.server-offline') as string}
              </FadeText>
            </View>
          </View>
        )}

        {/* Mixnet transport status, icon-only, and the way into the
            diagnostics: the icon that reports the trouble is the one that
            opens the screen explaining it. Rendered only where the platform
            has a transport. A pulsing green halo means connecting, a bare
            icon means ready, a coral halo means lost, a traveling yellow arc
            means reconnecting, and the off glyph means the session went Offline —
            the icon reports nym's own state, so it is never hidden to hide a
            transport that might still be up. */}
        {phase !== 'absent' && (
          <TouchableOpacity
            hitSlop={slopFor(24)}
            testID="header.mixnet-status"
            accessibilityLabel={translate('settings.nym-diagnostics') as string}
            onPress={() => navigation.navigate(Route.MixnetDoctor)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0,
              marginHorizontal: 2.5,
              paddingHorizontal: 5,
              paddingVertical: 1,
              minWidth: 25,
              minHeight: 25,
            }}
          >
            <MixnetIcon phase={phase} />
          </TouchableOpacity>
        )}

        {!noPrivacy && setPrivacyOption && addLastSnackbar && noBalance && (
          <PrivacyToggle
            privacy={privacy}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
            translate={translate}
          />
        )}
      </View>
    );
  },
);

export default SyncStatusBar;
