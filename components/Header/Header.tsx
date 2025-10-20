/* eslint-disable react-native/no-inline-styles */
import {
  faBars,
  faCheck,
  faInfoCircle,
  faPlay,
  faCloudDownload,
  faLockOpen,
  faLock,
  faSnowflake,
  //faXmark,
  faWifi,
  faChevronLeft,
  faGear,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation, useTheme } from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Image, TouchableOpacity, View } from 'react-native';
import {
  NetInfoType,
  TranslateType,
  ModeEnum,
  CurrencyEnum,
  PoolToShieldEnum,
  SnackbarType,
  ButtonTypeEnum,
  GlobalConst,
  SelectServerEnum,
  RouteEnum,
  ScreenEnum,
  UfvkActionEnum,
} from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import CurrencyAmount from '../Components/CurrencyAmount';
import PriceFetcher from '../Components/PriceFetcher';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import Button from '../Components/Button';
import RPC from '../../app/rpc';
import { RPCShieldType } from '../../app/rpc/types/RPCShieldType';
import { createAlert } from '../../app/createAlert';
import { Animated } from 'react-native';
import FadeText from '../Components/FadeText';
import simpleBiometrics from '../../app/simpleBiometrics';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import Utils from '../../app/utils';
import { RPCShieldProposeType } from '../../app/rpc/types/RPCShieldProposeType';
import RPCModule from '../../app/RPCModule';
import { RPCSyncStatusType } from '../../app/rpc/types/RPCSyncStatusType';
import { isEqual } from 'lodash';
import { TriangleAlert } from '../Components/Icons/TriangleAlert';

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
  // store the error if the App is in background
  setBackgroundError?: (title: string, error: string) => void;
  // first funds received legend for the Seed screen
  receivedLegend?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  toggleMenuDrawer,
  title,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  testID,
  translate: translateProp,
  netInfo: netInfoProp,
  mode: modeProp,
  privacy: privacyProp,
  setBackgroundError,
  noPrivacy,
  setPrivacyOption,
  addLastSnackbar,
  screenName,
  receivedLegend,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  closeScreen,
  noUfvkIcon,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    syncingStatus,
    currency,
    zecPrice,
    readOnly,
    valueTransfersTotal,
    somePending,
    security,
    language,
    shieldingAmount,
    selectServer,
    setZecPrice,
    background,
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
  moment.locale(language);

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [showShieldButton, setShowShieldButton] = useState<boolean>(false);
  const [percentageOutputsScanned, setPercentageOutputsScanned] = useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);
  const [shieldingFee, setShieldingFee] = useState<number>(0);
  const [viewSyncStatus, setViewSyncStatus] = useState<boolean>(false);

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
    // when the App is syncing this can fired a lot of times
    // with no so much sense...
    let runShieldProposeLock = false;
    const runShieldPropose = async (): Promise<string> => {
      try {
        if (runShieldProposeLock) {
          return 'Error: shield propose already running...';
        }
        runShieldProposeLock = true;
        const proposeStr: string = await RPCModule.shieldProcess();
        if (proposeStr) {
          if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
            console.log(`Error propose ${proposeStr}`);
            runShieldProposeLock = false;
            return proposeStr;
          }
        } else {
          console.log('Internal Error propose');
          runShieldProposeLock = false;
          return 'Error: Internal RPC Error: propose';
        }

        runShieldProposeLock = false;
        return proposeStr;
      } catch (error) {
        console.log(`Critical Error propose ${error}`);
        runShieldProposeLock = false;
        return `Error: ${error}`;
      }
    };

    if (
      !readOnly && setShieldingAmount && selectServer !== SelectServerEnum.offline && somePending
        ? 0
        : (totalBalance ? totalBalance.confirmedTransparentBalance : 0) > 0
    ) {
      (async () => {
        let proposeFee = 0;
        let proposeAmount = 0;
        const runProposeStr = await runShieldPropose();
        if (runProposeStr.toLowerCase().startsWith(GlobalConst.error)) {
          // snack with error
          console.log('Error shield proposing', runProposeStr);
          //Alert.alert('Calculating the FEE', runProposeStr);
        } else {
          try {
            const runProposeJson: RPCShieldProposeType = await JSON.parse(runProposeStr);
            if (runProposeJson.error) {
              // snack with error
              console.log('Error shield proposing', runProposeJson.error);
              //Alert.alert('Calculating the FEE', runProposeJson.error);
            } else {
              if (runProposeJson.fee) {
                //console.log('fee', runProposeJson.fee);
                proposeFee = runProposeJson.fee / 10 ** 8;
              }
              if (runProposeJson.value_to_shield) {
                //console.log('value to shield', runProposeJson.fee);
                proposeAmount = runProposeJson.value_to_shield / 10 ** 8;
              }
            }
          } catch (e) {
            // snack with error
            console.log('Error shield proposing', e);
            //Alert.alert('Calculating the FEE', runProposeJson.error);
          }
        }
        setShieldingFee(proposeFee);
        setShieldingAmount && setShieldingAmount(proposeAmount);
        //console.log(proposeFee, proposeAmount);
      })();
    } else {
      setShieldingFee(0);
      setShieldingAmount && setShieldingAmount(0);
    }
  }, [readOnly, setShieldingAmount, totalBalance, totalBalance?.confirmedTransparentBalance, somePending, selectServer]);

  useEffect(() => {
    setShowShieldButton(
      !readOnly && selectServer !== SelectServerEnum.offline && (somePending ? 0 : shieldingAmount) > 0,
    );
  }, [readOnly, shieldingAmount, somePending, selectServer]);

  useEffect(() => {
    const showIt = () => {
      setViewSyncStatus(true);
      setTimeout(() => {
        setViewSyncStatus(false);
      }, 5 * 1000);
    };
    const inter = setInterval(() => {
      showIt();
    }, 30 * 1000);

    return () => clearInterval(inter);
  }, []);

  const shieldFunds = async () => {
    if (!setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
      return;
    }

    // now zingolib only can shield `transparent`.
    let pools: PoolToShieldEnum = PoolToShieldEnum.transparentPoolToShield;

    // not use await here.
    navigation.navigate(RouteEnum.Computing);
    // because I don't what the user is doing, I need to the re-run the shield
    // command right before the confirmation
    await RPCModule.shieldProcess();
    const shieldStr = await RPC.rpcShieldFunds();

    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          [screenName],
          translate(`history.shield-title-${pools}`) as string,
          `${translate(`history.shield-error-${pools}`)} ${shieldStr}`,
          true,
          translate,
        );
      } else {
        try {
          const shieldJSON: RPCShieldType = await JSON.parse(shieldStr);

          if (shieldJSON.error) {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              [screenName],
              translate(`history.shield-title-${pools}`) as string,
              `${translate(`history.shield-error-${pools}`)} ${shieldJSON.error}`,
              true,
              translate,
            );
          } else if (shieldJSON.txids) {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              [screenName],
              translate(`history.shield-title-${pools}`) as string,
              `${translate(`history.shield-message-${pools}`)} ${shieldJSON.txids.join(', ')}`,
              true,
              translate,
            );
          }
        } catch (e) {
          createAlert(
            setBackgroundError,
            addLastSnackbar,
            [screenName],
            translate(`history.shield-title-${pools}`) as string,
            `${translate(`history.shield-message-${pools}`)} ${shieldStr}`,
            true,
            translate,
          );
        }
      }
      // scroll to top in history, just in case.
      if (setScrollToTop) {
        setScrollToTop(true);
      }
      // scroll to bottom in messages, just in case.
      if (setScrollToBottom) {
        setScrollToBottom(true);
      }
      setShieldingFee(0);
      setShieldingAmount && setShieldingAmount(0);

      // change to the history screen, just in case.
      navigation.navigate(RouteEnum.HomeStack, {
        screen: RouteEnum.History,
      });
    }
  };

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

  const calculateAmountToShield = (): string => {
    return Utils.parseNumberFloatToStringLocale(somePending ? 0 : shieldingAmount, 8);
  };

  const calculatePoolsToShield = (): string => {
    return PoolToShieldEnum.transparentPoolToShield;
  };

  const calculateDisableButtonToShield = (): boolean => {
    return (somePending ? 0 : shieldingAmount) <= 0;
  };

  const onPressShieldFunds = () => {
    Alert.alert(
      translate(`history.shield-title-${calculatePoolsToShield()}`) as string,
      translate(`history.shield-alert-${calculatePoolsToShield()}`) as string,
      [
        { text: translate('confirm') as string, onPress: () => shieldFunds() },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const ufvkShowModal = async () => {
    const resultBio = security.seedUfvkScreen ? await simpleBiometrics({ translate: translate }) : true;
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
      navigation.navigate(RouteEnum.Ufvk, { 
        action: UfvkActionEnum.view 
      });
    }
  };

  const privacyComponent = () => (
    <TouchableOpacity
      style={{ marginHorizontal: 5 }}
      onPress={() => {
        addLastSnackbar &&
          addLastSnackbar({
            message: `${translate('change-privacy')} ${
              privacy
                ? translate('settings.value-privacy-false')
                : (((translate('settings.value-privacy-true') as string) +
                    translate('change-privacy-legend')) as string)
            }`,
            screenName: [screenName],
          });
        setPrivacyOption && setPrivacyOption(!privacy);
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
            margin: 0,
            marginHorizontal: 2.5,
            padding: 0,
            minWidth: 25,
            minHeight: 25,
          }}>
          {privacy ? (
            <FontAwesomeIcon icon={faLock} size={25} color={colors.primary} />
          ) : (
            <FontAwesomeIcon icon={faLockOpen} size={25} color={colors.primaryDisabled} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  //console.log('Render header &&&&&&&&&&&&&&&&&&&&&');

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
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 12,
              marginHorizontal: 5,
            }}>
            {!noSyncingStatus && selectServer !== SelectServerEnum.offline && (
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
                          borderColor: colors.primary,
                          borderWidth: 1,
                          borderRadius: 10,
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
                          <FontAwesomeIcon icon={faCheck} color={colors.primary} size={19} />
                          {viewSyncStatus && (
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{translate('synced') as string}</FadeText>
                          )}
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
                          borderColor: colors.syncing,
                          borderWidth: 1,
                          borderRadius: 10,
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
                          {mode === ModeEnum.basic ? (
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                              <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={19} />
                              {viewSyncStatus && (
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                                  {translate('syncing') as string}
                                </FadeText>
                              )}
                              {viewSyncStatus && percentageOutputsScanned > 0 && (
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{' - '}</FadeText>
                              )}
                              {percentageOutputsScanned > 0 && (
                                <FadeText
                                  style={{ fontSize: 10, marginLeft: 2 }}>{` ${percentageOutputsScanned}%`}</FadeText>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity testID="header.playicon" onPress={() => {
                                navigation.navigate(RouteEnum.SyncReport);
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={19} />
                                {viewSyncStatus && (
                                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                                    {translate('syncing') as string}
                                  </FadeText>
                                )}
                                {viewSyncStatus && percentageOutputsScanned > 0 && (
                                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{' - '}</FadeText>
                                )}
                                {percentageOutputsScanned > 0 && (
                                  <FadeText
                                    style={{ fontSize: 10, marginLeft: 2 }}>{` ${percentageOutputsScanned}%`}</FadeText>
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
                          margin: 0,
                          marginHorizontal: 2.5,
                          padding: 1,
                          borderColor: colors.primaryDisabled,
                          borderWidth: 1,
                          borderRadius: 10,
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
                            <FontAwesomeIcon icon={faWifi} color={colors.primaryDisabled} size={19} />
                            {false && (
                              <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                                {translate('connecting') as string}
                              </FadeText>
                            )}
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
            {selectServer === SelectServerEnum.offline && (
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
                  <FontAwesomeIcon icon={faWifi} color={'red'} size={18} />
                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                    {translate('settings.server-offline') as string}
                  </FadeText>
                </View>
              </View>
            )}
            {mode !== ModeEnum.basic &&
              !noPrivacy &&
              setPrivacyOption &&
              addLastSnackbar &&
              noBalance &&
              privacyComponent()}
            {!noSyncingStatus && !!background.error && mode === ModeEnum.advanced && (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  marginHorizontal: 5,
                  padding: 0,
                  minWidth: 25,
                  minHeight: 25,
                }}>
                <TouchableOpacity onPress={() => {
                    navigation.navigate(RouteEnum.SyncReport);
                  }}
                >
                  <TriangleAlert color={colors.warning.primary} size={24} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!noBalance && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
              }}>
              {mode !== ModeEnum.basic && !noPrivacy && setPrivacyOption && addLastSnackbar && privacyComponent()}
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
              {mode !== ModeEnum.basic &&
                totalBalance &&
                (totalBalance.totalOrchardBalance !== totalBalance.confirmedOrchardBalance ||
                  totalBalance.totalSaplingBalance > 0 ||
                  totalBalance.totalTransparentBalance > 0) && (
                  <TouchableOpacity onPress={() => {
                      navigation.navigate(RouteEnum.Pools);
                    }}
                  >
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.card,
                        borderRadius: 10,
                        margin: 0,
                        marginLeft: 5,
                        padding: 0,
                        minWidth: 25,
                        minHeight: 25,
                      }}>
                      <FontAwesomeIcon icon={faInfoCircle} size={25} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                )}
            </View>
          )}

          {receivedLegend && totalBalance && totalBalance.totalOrchardBalance + totalBalance.totalSaplingBalance > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
              }}>
              <RegText color={colors.primary}>{translate('seed.youreceived') as string}</RegText>
              <ZecAmount
                currencyName={info.currencyName}
                color={colors.primary}
                size={18}
                amtZec={totalBalance.totalOrchardBalance + totalBalance.totalSaplingBalance}
                privacy={privacy}
              />
              <RegText color={colors.primary}>!!!</RegText>
            </View>
          )}

          {(currency === CurrencyEnum.USDCurrency || currency === CurrencyEnum.USDTORCurrency) &&
            !noBalance &&
            selectServer !== SelectServerEnum.offline && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CurrencyAmount
                  style={{ marginTop: 0, marginBottom: 0 }}
                  price={zecPrice.zecPrice}
                  amtZec={totalBalance
                    ? totalBalance.totalOrchardBalance +
                      totalBalance.totalSaplingBalance +
                      totalBalance.totalTransparentBalance
                    : 0}
                  currency={currency}
                  privacy={privacy}
                />
                <View style={{ marginLeft: 5 }}>
                  <PriceFetcher setZecPrice={setZecPrice} screenName={screenName} />
                </View>
              </View>
            )}

          {showShieldButton && !noBalance && !calculateDisableButtonToShield() && valueTransfersTotal !== null && (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <FadeText style={{ fontSize: 8 }}>
                {(translate(`history.shield-legend-${calculatePoolsToShield()}`) as string) +
                  ` ${calculateAmountToShield()} ` +
                  (translate('send.fee') as string) +
                  ': ' +
                  Utils.parseNumberFloatToStringLocale(shieldingFee, 8) +
                  ' '}
              </FadeText>
              <View style={{ margin: 5, flexDirection: 'row' }}>
                <Button
                  testID="header.shield"
                  type={ButtonTypeEnum.Primary}
                  title={translate(`history.shield-${calculatePoolsToShield()}`) as string}
                  onPress={onPressShieldFunds}
                  disabled={calculateDisableButtonToShield()}
                />
              </View>
            </View>
          )}
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
                <FontAwesomeIcon icon={faBars} size={40} color={colors.border} />
              </TouchableOpacity>
            )}
            {readOnly && !noUfvkIcon && (
              <>
                {!(mode === ModeEnum.basic && valueTransfersTotal !== null && valueTransfersTotal <= 0) &&
                !(mode === ModeEnum.basic && totalBalance && totalBalance.totalOrchardBalance + totalBalance.totalSaplingBalance <= 0) ? (
                  <TouchableOpacity onPress={() => ufvkShowModal()}>
                    <FontAwesomeIcon icon={faSnowflake} size={24} color={colors.zingo} />
                  </TouchableOpacity>
                ) : (
                  <FontAwesomeIcon icon={faSnowflake} size={24} color={colors.zingo} />
                )}
              </>
            )}
          </View>
        </View>

        <View
          style={{
            padding: 13,
            position: 'absolute',
            right: 0,
          }}>
          {!noDrawMenu ? (
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
                  navigation.navigate(RouteEnum.Settings);
                }
              }}>
              <FontAwesomeIcon icon={faGear} size={35} color={colors.border} />
            </TouchableOpacity>
          ) : (
            <Image
              source={require('../../assets/img/logobig-zingo.png')}
              style={{ width: 38, height: 38, resizeMode: 'contain', borderRadius: 10 }}
            />
          )}
        </View>
      </View>
      <View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            width: '100%',
            marginVertical: 5,
          }}>
          {closeScreen ? (
            <>
              <TouchableOpacity onPress={() => closeScreen()}>
                <FontAwesomeIcon
                  style={{ marginHorizontal: 10 }}
                  size={30}
                  icon={faChevronLeft}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <RegText testID={testID} color={colors.money} style={{ paddingHorizontal: 5 }}>
                {title}
              </RegText>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
            </>
          ) : (
            <>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
              <RegText testID={testID} color={colors.money} style={{ paddingHorizontal: 5, textAlign: 'center' }}>
                {title}
              </RegText>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
            </>
          )}
        </View>

        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>
    </>
  );
};

export default Header;
