/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '../../../../app/theme';
import {
  faCheck,
  faCloudDownload,
  faPlay,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import {
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
  TranslateType,
} from '../../../../app/AppState';
import NetInfoType from '../../../../app/AppState/types/NetInfoType';
import { MixnetView } from '../../../../app/walletBackend/transforms/mixnetPresenter';
import FadeText from '../../../primitives/FadeText';
import NymOn from '../../../../assets/img/nym-on.svg';
import MixnetIcon, { mixnetPhase } from '../../../primitives/Icons/MixnetIcon';
import PrivacyToggle from './PrivacyToggle';

type SyncStatusBarProps = {
  noSyncingStatus: boolean | undefined;
  selectServer: SelectServerEnum;
  netInfo: NetInfoType;
  mode: ModeEnum;
  percentageOutputsScanned: number;
  syncInProgress: boolean;
  viewSyncStatus: boolean;
  opacityValue: Animated.Value;
  nym: boolean;
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
    mode,
    percentageOutputsScanned,
    syncInProgress,
    viewSyncStatus,
    opacityValue,
    nym,
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
                      {mode === ModeEnum.basic ? (
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
                      ) : (
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
                      )}
                    </Animated.View>
                  </View>
                )}
              </>
            ) : (
              <>
                {netInfo.isConnected && mode === ModeEnum.advanced && (
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
                {mode === ModeEnum.basic ? (
                  <FontAwesomeIcon
                    icon={faCloudDownload}
                    color={!netInfo.isConnected ? 'red' : 'yellow'}
                    size={16}
                  />
                ) : (
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
                )}
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

        {/* NYM feature hidden for now — will be enabled in the future */}
        {false && !noSyncingStatus && nym && (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NymOn width={16} height={16} />
          </View>
        )}

        {/* Mixnet Mode (send-over-nym): the per-session transport status,
            icon-only. Rendered only where the policy runs (mixnetView is null
            on platforms whose transport has not landed) and never in the `off`
            state (deliberate clearnet: phase is null). A pulsing green halo
            means connecting, a bare icon means ready, a coral halo means lost,
            a traveling yellow arc means reconnecting. */}
        {mixnetView !== null && phase !== null && (
          <View
            testID="header.mixnet-status"
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
          </View>
        )}

        {mode !== ModeEnum.basic &&
          !noPrivacy &&
          setPrivacyOption &&
          addLastSnackbar &&
          noBalance && (
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
