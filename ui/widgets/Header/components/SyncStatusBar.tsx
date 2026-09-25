/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import {
  faCheck,
  faCloudDownload,
  faPlay,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import {
  RouteEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import NetInfoType from '@app/AppState/types/NetInfoType';
import {
  MixnetView,
  mixnetPhase,
} from '@app/walletBackend/transforms/mixnetView';
import FadeText from '@ui/primitives/FadeText';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';
import PrivacyToggle from './PrivacyToggle';

type SyncStatusBarProps = {
  noSyncingStatus: boolean | undefined;
  selectServer: SelectServerEnum;
  netInfo: NetInfoType;
  percentageOutputsScanned: number;
  syncInProgress: boolean;
  viewSyncStatus: boolean;
  opacityValue: Animated.Value;
  mixnetView: MixnetView | null;
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
    selectServer,
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
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { colors } = useTheme();
    const phase =
      mixnetView !== null
        ? mixnetPhase(mixnetView.statusKey, mixnetView.reconnecting)
        : null;

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
        {!noSyncingStatus && selectServer !== SelectServerEnum.offline && (
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
                      <FontAwesomeIcon
                        icon={faCheck}
                        color={colors.fgAccent}
                        size={16}
                      />
                      {viewSyncStatus && (
                        <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
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
                          navigation.navigate(RouteEnum.SyncReport);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPlay}
                            color={colors.fgSyncing}
                            size={16}
                          />
                          {viewSyncStatus && (
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                              {translate('syncing') as string}
                            </FadeText>
                          )}
                          {viewSyncStatus && percentageOutputsScanned > 0 && (
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                              {' - '}
                            </FadeText>
                          )}
                          {percentageOutputsScanned > 0 && (
                            <FadeText
                              style={{ fontSize: 10, marginLeft: 2 }}
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
                      onPress={() => {
                        navigation.navigate(RouteEnum.SyncReport);
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
                        <FontAwesomeIcon
                          icon={faWifi}
                          color={colors.fgAccentDisabled}
                          size={16}
                        />
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
                  onPress={() => {
                    navigation.navigate(RouteEnum.SyncReport);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faCloudDownload}
                    color={!netInfo.isConnected ? 'red' : 'yellow'}
                    size={16}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {selectServer === SelectServerEnum.offline && (
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
              <FontAwesomeIcon icon={faWifi} color={'red'} size={14} />
              <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                {translate('settings.server-offline') as string}
              </FadeText>
            </View>
          </View>
        )}

        {/* Mixnet transport status, icon-only, and the way into the
            diagnostics: the icon that reports the trouble is the one that
            opens the screen explaining it. Rendered only where the policy
            runs (mixnetView is null on platforms whose transport has not
            landed). A pulsing green halo means connecting, a bare icon means
            ready, a coral halo means lost, a traveling yellow arc means
            reconnecting, and the off glyph means the session went Offline —
            the icon reports nym's own state, so it is never hidden to hide a
            transport that might still be up. */}
        {mixnetView !== null && phase !== null && (
          <TouchableOpacity
            testID="header.mixnet-status"
            accessibilityLabel={translate('settings.nym-diagnostics') as string}
            onPress={() => navigation.navigate(RouteEnum.MixnetDoctor)}
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
