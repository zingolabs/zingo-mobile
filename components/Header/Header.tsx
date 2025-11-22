/* eslint-disable react-native/no-inline-styles */
import {
  faBars,
  faCloudDownload,
  faGear,
  faArrowUp,
  faArrowDown,
  faFaucet,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation, useTheme } from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  NetInfoType,
  TranslateType,
  ModeEnum,
  SnackbarType,
  SelectServerEnum,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import ZecAmount from '../Components/ZecAmount';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import { Animated } from 'react-native';
import FadeText from '../Components/FadeText';
import simpleBiometrics from '../../app/simpleBiometrics';
import { RPCSyncStatusType } from '../../app/rpc/types/RPCSyncStatusType';
import { isEqual } from 'lodash';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  screenName: ScreenEnum;
  // side menu
  noDrawMenu?: boolean;
  toggleMenuDrawer?: () => void;
  closeScreen?: () => void;
  // balance
  noBalance?: boolean;
  // syncing icons
  noSyncingStatus?: boolean;
  // ufvk
  noUfvkIcon?: boolean;
  // privacy
  noPrivacy?: boolean;
  setPrivacyOption?: (value: boolean) => Promise<void>;
  addLastSnackbar?: (snackbar: SnackbarType) => void;
  // shielding
  setShieldingAmount?: (value: number) => void;
  setScrollToTop?: (value: boolean) => void;
  setScrollToBottom?: (value: boolean) => void;
  // seed screen - shared between AppLoading & AppLoadad - different contexts
  translate?: (key: string) => TranslateType;
  netInfo?: NetInfoType;
  mode?: ModeEnum;
  privacy?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  toggleMenuDrawer,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  translate: translateProp,
  netInfo: netInfoProp,
  mode: modeProp,
  privacy: privacyProp,
  addLastSnackbar,
  screenName,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    syncingStatus,
    security,
    selectIndexerServer,
    lastError,
  } = context;

  let translate: (key: string) => TranslateType, netInfo: NetInfoType, mode: ModeEnum, privacy: boolean;
  if (translateProp) {
    translate = translateProp;
  } else {
    translate = context.translate;
  }
  if (netInfoProp) {
    netInfo = netInfoProp;
  } else {
    netInfo = context.netInfo;
  }
  if (modeProp) {
    mode = modeProp;
  } else {
    mode = context.mode;
  }
  if (privacyProp) {
    privacy = privacyProp;
  } else {
    privacy = context.privacy;
  }

  const { colors } = useTheme() as ThemeType;

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [percentageOutputsScanned, setPercentageOutputsScanned] = useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);

  useEffect(() => {
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      syncingStatus.percentage_total_outputs_scanned === 0
    ) {
      // if the App is waiting for the first fetching, let's put 0.
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      // avoiding 0.00 or 100%, minimum 0.01, maximun 99.99
      setPercentageOutputsScanned(
        syncingStatus.percentage_total_outputs_scanned && syncingStatus.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : syncingStatus.percentage_total_outputs_scanned && syncingStatus.percentage_total_outputs_scanned > 99.99
            ? 99.99
            : Number(syncingStatus.percentage_total_outputs_scanned?.toFixed(2).replace(/\.?0+$/, '')),
      );
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
        syncingStatus.scan_ranges.length > 0 &&
        !!syncingStatus.percentage_total_outputs_scanned &&
        syncingStatus.percentage_total_outputs_scanned < 100,
      );
    }
  }, [syncingStatus, syncingStatus.percentage_total_outputs_scanned, syncingStatus.scan_ranges]);

  useEffect(() => {
    // Inicializa la animación solo una vez
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    if (!noSyncingStatus) {
      if (syncInProgress) {
        animationRef.current?.start();
      } else {
        animationRef.current?.stop();
        opacityValue.setValue(1);
      }
    } else {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncInProgress, noSyncingStatus]);

  console.log('Render header', percentageOutputsScanned);

  return (
    <>
      <View>
        <View
          testID="header"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingBottom: 0,
            backgroundColor: colors.card,
            paddingTop: 10,
            minHeight: !noDrawMenu ? 60 : 25,
          }}>

          {!noBalance && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
              }}>
              <ZecAmount
                currencyName={info.currencyName}
                color={colors.text}
                size={36}
                amtZec={totalBalance
                  ? totalBalance.totalOrchardBalance +
                    totalBalance.totalSaplingBalance +
                    totalBalance.totalTransparentBalance
                  : 0}
                privacy={privacy}
                smallPrefix={true}
              />
            </View>
          )}

          <View
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              width: '30%',
              height: 5,
              marginTop: 10,
              borderRadius: 3,
            }}>
            {netInfo.isConnected && !(percentageOutputsScanned === 0) && (
              <>
                <View
                  style={{
                    height: 5,
                    width: '100%',
                    borderRadius: 3,
                    backgroundColor: colors.secondary,
                  }}
                />
                <View
                  style={{
                    height: 5,
                    width: `${percentageOutputsScanned}%`,
                    borderRadius: 3,
                    backgroundColor: 'green',
                    marginTop: -5,
                  }}
                />
              </>
            )}
            {netInfo.isConnected && percentageOutputsScanned === 0 && (
              <View
                style={{
                  height: 5,
                  width: '100%',
                  borderRadius: 3,
                  backgroundColor: colors.syncing,
                }}
              />
            )}
          </View>
          
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 0,
              marginHorizontal: 5,
            }}>
            {!noSyncingStatus && selectIndexerServer !== SelectServerEnum.offline && (
              <View style={{ minHeight: 29, flexDirection: 'row' }}>
                {netInfo.isConnected && !(percentageOutputsScanned === 0) ? (
                  <>
                    {!syncInProgress && (
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: 0,
                          marginHorizontal: 2.5,
                          padding: 1,
                          minWidth: 25,
                          minHeight: 25,
                        }}>
                        <View
                          testID="header.checkicon"
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 3,
                          }}>
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{translate('synced') as string}</FadeText>
                        </View>
                      </View>
                    )}
                    {syncInProgress && (
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: 0,
                          marginHorizontal: 2.5,
                          padding: 1,
                          minWidth: 25,
                          minHeight: 25,
                        }}>
                        <Animated.View
                          style={{
                            opacity: opacityValue,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 3,
                          }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{translate('syncing') as string}</FadeText>
                            {percentageOutputsScanned > 0 && (
                              <>
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{' - '}</FadeText>
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{` ${percentageOutputsScanned}%`}
                                </FadeText>
                              </>
                            )}
                          </View>
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
                          margin: 0,
                          marginHorizontal: 2.5,
                          padding: 1,
                          minWidth: 25,
                          minHeight: 25,
                        }}>
                        <TouchableOpacity onPress={() => {
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
                            }}>
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                              {translate('connecting') as string}
                            </FadeText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
                {(!netInfo.isConnected ||
                  netInfo.type === NetInfoStateType.cellular ||
                  netInfo.isConnectionExpensive) && false && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 0,
                      marginHorizontal: 2.5,
                      padding: 0,
                      minWidth: 25,
                      minHeight: 25,
                    }}>
                    {mode === ModeEnum.basic ? (
                      <FontAwesomeIcon
                        icon={faCloudDownload}
                        color={!netInfo.isConnected ? 'red' : 'yellow'}
                        size={20}
                      />
                    ) : (
                      <TouchableOpacity onPress={() => {
                          navigation.navigate(RouteEnum.SyncReport);
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faCloudDownload}
                          color={!netInfo.isConnected ? 'red' : 'yellow'}
                          size={20}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
            {selectIndexerServer === SelectServerEnum.offline && (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  marginHorizontal: 2.5,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderColor: colors.zingo,
                  borderWidth: 1,
                  borderRadius: 10,
                  minWidth: 25,
                  minHeight: 25,
                }}>
                <View
                  testID="header.offlineicon"
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 3,
                  }}>
                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                    {translate('settings.server-offline') as string}
                  </FadeText>
                </View>
              </View>
            )}
          </View>

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 10,
          }}>
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
              <TouchableOpacity 
                style={{ justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  navigation.navigate(RouteEnum.Send);
              }}>
                <View
                  style={{
                    borderRadius: 35,
                    backgroundColor: colors.secondary,
                    padding: 20,
                    margin: 10,
                }}>
                  <FontAwesomeIcon
                    size={30}
                    icon={faArrowUp}
                    color={colors.text}
                    style={{ transform: [{ rotate: '45deg' }] }}
                  />
                </View>
                <FadeText>Send</FadeText>
              </TouchableOpacity>
            </View>

            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
              <TouchableOpacity 
                style={{ justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  navigation.navigate(RouteEnum.Receive);
              }}>
                <View
                  style={{
                    borderRadius: 35,
                    backgroundColor: colors.secondary,
                    padding: 20,
                    margin: 10,
                }}>
                  <FontAwesomeIcon
                    size={30}
                    icon={faArrowDown}
                    color={colors.text}
                    style={{ transform: [{ rotate: '45deg' }] }}
                  />
                </View>
                <FadeText>Receive</FadeText>
              </TouchableOpacity>
            </View>

            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
              <TouchableOpacity 
                style={{ justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  navigation.navigate(RouteEnum.Claim);
              }}>
                <View
                  style={{
                    borderRadius: 35,
                    backgroundColor: colors.secondary,
                    padding: 20,
                    margin: 10,
                }}>
                  <FontAwesomeIcon
                    size={30}
                    icon={faFaucet}
                    color={colors.text}
                  />
                </View>
                <FadeText>Claim</FadeText>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              padding: 11.5,
              position: 'absolute',
              left: 0,
            }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', height: 40 }}>
              {!noDrawMenu && (
                <TouchableOpacity
                  style={{ marginRight: 5 }}
                  testID="header.drawmenu"
                  accessible={true}
                  accessibilityLabel={translate('menudrawer-acc') as string}
                  onPress={toggleMenuDrawer}>
                  <FontAwesomeIcon icon={faBars} size={40} color={colors.background} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View
          style={{
            padding: 13,
            position: 'absolute',
            right: 0,
        }}>
          <TouchableOpacity
            style={{ marginRight: 5 }}
            testID="header.drawmenu"
            onPress={async () => {
              const resultBio = security.settingsScreen ? await simpleBiometrics({ translate: translate }) : true;
              // can be:
              // - true      -> the user do pass the authentication
              // - false     -> the user do NOT pass the authentication
              // - undefined -> no biometric authentication available -> Passcode.
              //console.log('BIOMETRIC --------> ', resultBio);
              if (resultBio === false) {
                // snack with Error & closing the menu.
                if (addLastSnackbar) {
                  addLastSnackbar({ message: translate('biometrics-error') as string, screenName: [screenName] });
                }
              } else {
                navigation.navigate(RouteEnum.SettingsMenu);
              }
            }}>
            <FontAwesomeIcon icon={faGear} size={35} color={colors.border} />
          </TouchableOpacity>
          {!!lastError && <FontAwesomeIcon style={{ alignSelf: 'flex-end' }} icon={faGear} size={5} color={colors.warning.primary} />}
        </View>
      </View>
    </>
  );
};

export default Header;
