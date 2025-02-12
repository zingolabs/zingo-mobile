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
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Image, TouchableOpacity, View } from 'react-native';
import {
  NetInfoType,
  TranslateType,
  ModeEnum,
  CurrencyEnum,
  SnackbarDurationEnum,
  PoolToShieldEnum,
  SnackbarType,
  ButtonTypeEnum,
  GlobalConst,
  CommandEnum,
  SelectServerEnum,
} from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import CurrencyAmount from '../Components/CurrencyAmount';
import PriceFetcher from '../Components/PriceFetcher';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { NetInfoStateType } from '@react-native-community/netinfo';
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
import Utils from '../../app/utils';
import { RPCShieldProposeType } from '../../app/rpc/types/RPCShieldProposeType';
import RPCModule from '../../app/RPCModule';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  // side menu
  noDrawMenu?: boolean;
  toggleMenuDrawer?: () => void;
  closeScreen?: () => void;
  // balance
  noBalance?: boolean;
  poolsMoreInfoOnClick?: () => void;
  // syncing icons
  noSyncingStatus?: boolean;
  syncingStatusMoreInfoOnClick?: () => void;
  // privacy
  noPrivacy?: boolean;
  setPrivacyOption?: (value: boolean) => Promise<void>;
  addLastSnackbar?: (snackbar: SnackbarType) => void;
  // shielding
  setShieldingAmount?: (value: number) => void;
  setComputingModalVisible?: (visible: boolean) => void;
  setScrollToTop?: (value: boolean) => void;
  setScrollToBottom?: (value: boolean) => void;
  // seed screen - shared between AppLoading & AppLoadad - different contexts
  translate?: (key: string) => TranslateType;
  netInfo?: NetInfoType;
  mode?: ModeEnum;
  privacy?: boolean;
  // store the error if the App is in background
  setBackgroundError?: (title: string, error: string) => void;
  // read-only wallet
  setUfvkViewModalVisible?: (v: boolean) => void;
  // first funds received legend for the Seed screen
  receivedLegend?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
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
  setComputingModalVisible,
  setBackgroundError,
  noPrivacy,
  setPrivacyOption,
  setUfvkViewModalVisible,
  addLastSnackbar,
  receivedLegend,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  closeScreen,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    syncingStatus,
    currency,
    zecPrice,
    readOnly,
    valueTransfersTotal,
    wallet,
    restartApp,
    somePending,
    security,
    language,
    shieldingAmount,
    navigation,
    selectServer,
    setZecPrice,
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

  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [showShieldButton, setShowShieldButton] = useState<boolean>(false);
  const [blocksRemaining, setBlocksRemaining] = useState<number>(0);
  const [shieldingFee, setShieldingFee] = useState<number>(0);
  const [viewSyncStatus, setViewSyncStatus] = useState<boolean>(false);

  useEffect(() => {
    let currentBl, lastBlockSe;
    if (wallet.birthday < syncingStatus.currentBlock) {
      currentBl = syncingStatus.currentBlock - wallet.birthday;
      lastBlockSe = syncingStatus.lastBlockServer - wallet.birthday;
    } else {
      currentBl = syncingStatus.currentBlock;
      lastBlockSe = syncingStatus.lastBlockServer;
    }
    let blocksRe = lastBlockSe - currentBl;
    // just in case, this value is weird...
    // if the syncing is still inProgress and this value is cero -> it is better for UX to see 1.
    // this use case is really rare.
    if (blocksRe <= 0) {
      blocksRe = 0;
    }
    setBlocksRemaining(blocksRe);
  }, [syncingStatus.currentBlock, syncingStatus.lastBlockServer, wallet.birthday]);

  useEffect(() => {
    if (syncingStatus.syncProcessStalled && addLastSnackbar && restartApp) {
      // if the sync process is stalled -> let's restart the App.
      addLastSnackbar({
        message: translate('restarting') as string,
        duration: SnackbarDurationEnum.short,
      });
      setTimeout(() => restartApp({ startingApp: false }), 3000);
    }
  }, [addLastSnackbar, restartApp, syncingStatus.syncProcessStalled, translate]);

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
        const proposeStr: string = await RPCModule.execute(CommandEnum.shield, '');
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

    if (!readOnly && setShieldingAmount && selectServer !== SelectServerEnum.offline) {
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
        setShieldingAmount(proposeAmount);
        //console.log(proposeFee, proposeAmount);
      })();
    }
  }, [readOnly, setShieldingAmount, totalBalance?.transparentBal, somePending, selectServer]);

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
    if (!setComputingModalVisible || !setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }

    // now zingolib only can shield `transparent`.
    let pools: PoolToShieldEnum = PoolToShieldEnum.transparentPoolToShield;

    setComputingModalVisible(true);
    // We need to activate this flag because if the App is syncing
    // while shielding, then it going to finish the current batch
    // and after that it run the shield process.
    await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.true);
    // because I don't what the user is doing, I need to the re-run the shield
    // command right before the confirmation
    await RPCModule.execute(CommandEnum.shield, '');
    const shieldStr = await RPC.rpcShieldFunds();

    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
        createAlert(
          setBackgroundError,
          addLastSnackbar,
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
              translate(`history.shield-title-${pools}`) as string,
              `${translate(`history.shield-error-${pools}`)} ${shieldJSON.error}`,
              true,
              translate,
            );
          } else if (shieldJSON.txids) {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
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
            translate(`history.shield-title-${pools}`) as string,
            `${translate(`history.shield-message-${pools}`)} ${shieldStr}`,
            true,
            translate,
          );
        }
      }
      await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
      // change to the history screen, just in case.
      if (navigation) {
        navigation.navigate(translate('loadedapp.history-menu') as string);
      }
      // scroll to top in history, just in case.
      if (setScrollToTop) {
        setScrollToTop(true);
      }
      // scroll to bottom in messages, just in case.
      if (setScrollToBottom) {
        setScrollToBottom(true);
      }
      setComputingModalVisible(false);
    }
  };

  useEffect(() => {
    const animation = Animated.loop(
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

    animationRef.current = animation;

    if (!noSyncingStatus) {
      if (syncingStatus.inProgress) {
        animationRef.current?.start();
      } else {
        animationRef.current?.stop();
      }
    } else {
      animationRef.current?.stop();
    }

    return () => {
      animationRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncingStatus.inProgress, noSyncingStatus]);

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
        addLastSnackbar({ message: translate('biometrics-error') as string });
      }
    } else {
      if (setUfvkViewModalVisible) {
        setUfvkViewModalVisible(true);
      }
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
            marginRight: 5,
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

  //console.log('render header &&&&&&&&&&&&&&&&&&&&&', privacy);

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
            zIndex: -1,
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
              <View style={{ minHeight: 25, flexDirection: 'row' }}>
                {netInfo.isConnected && !!syncingStatus.lastBlockServer && syncingStatus.syncID >= 0 ? (
                  <>
                    {!syncingStatus.inProgress && syncingStatus.lastBlockServer === syncingStatus.lastBlockWallet && (
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: 0,
                          marginRight: 5,
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
                            paddingHorizontal: 3,
                          }}>
                          <FontAwesomeIcon icon={faCheck} color={colors.primary} size={20} />
                          {viewSyncStatus && (
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{translate('synced') as string}</FadeText>
                          )}
                        </View>
                      </View>
                    )}
                    {syncingStatus.inProgress && (
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: 0,
                          marginRight: 5,
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
                            paddingHorizontal: 3,
                          }}>
                          {mode === ModeEnum.basic ? (
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                              <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={17} />
                              {viewSyncStatus && (
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                                  {translate('syncing') as string}
                                </FadeText>
                              )}
                              {blocksRemaining > 0 && (
                                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{`${blocksRemaining}`}</FadeText>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity
                              testID="header.playicon"
                              onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={17} />
                                {viewSyncStatus && (
                                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                                    {translate('syncing') as string}
                                  </FadeText>
                                )}
                                {blocksRemaining > 0 && (
                                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{`${blocksRemaining}`}</FadeText>
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
                          marginRight: 5,
                          padding: 1,
                          borderColor: colors.primaryDisabled,
                          borderWidth: 1,
                          borderRadius: 10,
                          minWidth: 25,
                          minHeight: 25,
                        }}>
                        <TouchableOpacity
                          onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                          <View
                            testID="header.wifiicon"
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center',
                              paddingHorizontal: 3,
                            }}>
                            <FontAwesomeIcon icon={faWifi} color={colors.primaryDisabled} size={18} />
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
                  netInfo.isConnectionExpensive) && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 0,
                      marginRight: 5,
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
                      <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
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
                  marginRight: 5,
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
                amtZec={totalBalance ? totalBalance.total : 0}
                privacy={privacy}
                smallPrefix={true}
              />
              {mode !== ModeEnum.basic &&
                totalBalance &&
                (totalBalance.orchardBal !== totalBalance.spendableOrchard ||
                  totalBalance.privateBal > 0 ||
                  totalBalance.transparentBal > 0) && (
                  <TouchableOpacity onPress={() => poolsMoreInfoOnClick && poolsMoreInfoOnClick()}>
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

          {receivedLegend && totalBalance && totalBalance.total > 0 && (
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
                amtZec={totalBalance.total}
                privacy={privacy}
              />
              <RegText color={colors.primary}>!!!</RegText>
            </View>
          )}

          {currency === CurrencyEnum.USDCurrency && !noBalance && selectServer !== SelectServerEnum.offline && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CurrencyAmount
                style={{ marginTop: 0, marginBottom: 0 }}
                price={zecPrice.zecPrice}
                amtZec={totalBalance ? totalBalance.total : 0}
                currency={currency}
                privacy={privacy}
              />
              <View style={{ marginLeft: 5 }}>
                <PriceFetcher setZecPrice={setZecPrice} />
              </View>
            </View>
          )}

          {showShieldButton &&
            !calculateDisableButtonToShield() &&
            setComputingModalVisible &&
            valueTransfersTotal !== null && (
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
          <View style={{ alignItems: 'center', flexDirection: 'row', height: 45 }}>
            {!noDrawMenu && (
              <TouchableOpacity
                style={{ marginRight: 5 }}
                testID="header.drawmenu"
                accessible={true}
                accessibilityLabel={translate('menudrawer-acc') as string}
                onPress={toggleMenuDrawer}>
                <FontAwesomeIcon icon={faBars} size={45} color={colors.border} />
              </TouchableOpacity>
            )}
            {readOnly && (
              <>
                {setUfvkViewModalVisible &&
                !(mode === ModeEnum.basic && valueTransfersTotal !== null && valueTransfersTotal <= 0) &&
                !(mode === ModeEnum.basic && totalBalance && totalBalance.total <= 0) ? (
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
            padding: 15,
            position: 'absolute',
            right: 0,
          }}>
          <Image
            source={require('../../assets/img/logobig-zingo.png')}
            style={{ width: 38, height: 38, resizeMode: 'contain', borderRadius: 10 }}
          />
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
          {noDrawMenu && closeScreen ? (
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
