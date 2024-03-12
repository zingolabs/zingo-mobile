/* eslint-disable react-native/no-inline-styles */
import {
  faBars,
  faCheck,
  faInfoCircle,
  faPlay,
  faPause,
  faCloudDownload,
  faLockOpen,
  faLock,
  faSnowflake,
  faXmark,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { NetInfoType, TranslateType } from '../../app/AppState';
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
import SnackbarType from '../../app/AppState/types/SnackbarType';
import FadeText from '../Components/FadeText';
import simpleBiometrics from '../../app/simpleBiometrics';

type HeaderProps = {
  poolsMoreInfoOnClick?: () => void;
  syncingStatusMoreInfoOnClick?: () => void;
  toggleMenuDrawer?: () => void;
  setZecPrice?: (p: number, d: number) => void;
  title: string;
  noBalance?: boolean;
  noSyncingStatus?: boolean;
  noDrawMenu?: boolean;
  testID?: string;
  translate?: (key: string) => TranslateType;
  netInfo?: NetInfoType;
  mode?: 'basic' | 'advanced';
  setComputingModalVisible?: (visible: boolean) => void;
  setBackgroundError?: (title: string, error: string) => void;
  noPrivacy?: boolean;
  set_privacy_option?: (name: 'privacy', value: boolean) => Promise<void>;
  setPoolsToShieldSelectSapling?: (v: boolean) => void;
  setPoolsToShieldSelectTransparent?: (v: boolean) => void;
  setUfvkViewModalVisible?: (v: boolean) => void;
  addLastSnackbar?: (snackbar: SnackbarType) => void;
  receivedLegend?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  toggleMenuDrawer,
  setZecPrice,
  title,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  testID,
  translate: translateProp,
  netInfo: netInfoProp,
  mode: modeProp,
  setComputingModalVisible,
  setBackgroundError,
  noPrivacy,
  set_privacy_option,
  setPoolsToShieldSelectSapling,
  setPoolsToShieldSelectTransparent,
  setUfvkViewModalVisible,
  addLastSnackbar,
  receivedLegend,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    syncingStatus,
    currency,
    zecPrice,
    privacy,
    readOnly,
    poolsToShieldSelectSapling,
    poolsToShieldSelectTransparent,
    transactions,
    wallet,
    restartApp,
    someUnconfirmed,
    security,
  } = context;

  let translate: (key: string) => TranslateType, netInfo: NetInfoType, mode: 'basic' | 'advanced';
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

  const { colors } = useTheme() as unknown as ThemeType;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const [showShieldButton, setShowShieldButton] = useState<boolean>(false);
  const [poolsToShield, setPoolsToShield] = useState<'' | 'all' | 'transparent' | 'sapling'>('');

  let currentBlock, lastBlockServer;
  if (wallet.birthday < syncingStatus.currentBlock) {
    currentBlock = syncingStatus.currentBlock - wallet.birthday;
    lastBlockServer = syncingStatus.lastBlockServer - wallet.birthday;
  } else {
    currentBlock = syncingStatus.currentBlock;
    lastBlockServer = syncingStatus.lastBlockServer;
  }
  /*
  let percent = ((currentBlock * 100) / lastBlockServer).toFixed(2);
  if (Number(percent) < 0) {
    percent = '0.00';
  }
  if (Number(percent) >= 100) {
    percent = '99.99';
  }
  */
  let blocksRemaining = lastBlockServer - currentBlock;
  // just in case, this value is weird...
  // if the syncing is still inProgress and this value is cero -> it is better for UX to see 1.
  // this use case is really rare.
  if (blocksRemaining <= 0) {
    blocksRemaining = 1;
  }

  useEffect(() => {
    if (syncingStatus.syncProcessStalled && addLastSnackbar && restartApp) {
      // if the sync process is stalled -> let's restart the App.
      addLastSnackbar({ message: translate('restarting') as string, type: 'Primary', duration: 'short' });
      setTimeout(() => restartApp({ startingApp: false }), 3000);
    }
  }, [addLastSnackbar, restartApp, syncingStatus.syncProcessStalled, translate]);

  useEffect(() => {
    setShowShieldButton(
      !readOnly &&
        totalBalance &&
        (someUnconfirmed ? 0 : totalBalance.transparentBal) + totalBalance.spendablePrivate > info.defaultFee,
    );

    if ((someUnconfirmed ? 0 : totalBalance.transparentBal) > 0 && totalBalance.spendablePrivate > 0) {
      setPoolsToShield('all');
    } else if ((someUnconfirmed ? 0 : totalBalance.transparentBal) > 0) {
      setPoolsToShield('transparent');
    } else if (totalBalance.spendablePrivate > 0) {
      setPoolsToShield('sapling');
    } else {
      setPoolsToShield('');
    }
  }, [
    mode,
    readOnly,
    totalBalance,
    totalBalance.transparentBal,
    totalBalance.spendablePrivate,
    info.defaultFee,
    someUnconfirmed,
  ]);

  useEffect(() => {
    // for basic mode always have to be 'all', It's easier for the user.
    if (mode === 'basic' && (poolsToShield === 'sapling' || poolsToShield === 'transparent')) {
      setPoolsToShield('all');
      if (setPoolsToShieldSelectSapling) {
        setPoolsToShieldSelectSapling(true);
      }
      if (setPoolsToShieldSelectTransparent) {
        setPoolsToShieldSelectTransparent(true);
      }
    }
  }, [mode, poolsToShield, setPoolsToShieldSelectSapling, setPoolsToShieldSelectTransparent]);

  const shieldFunds = async () => {
    if (!setComputingModalVisible || !setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (poolsToShield === '') {
      return;
    }

    let pools: 'all' | 'transparent' | 'sapling' | '' = poolsToShield;

    if (pools === 'all') {
      if (!poolsToShieldSelectSapling && !poolsToShieldSelectTransparent) {
        pools = '';
      } else if (poolsToShieldSelectSapling && !poolsToShieldSelectTransparent) {
        pools = 'sapling';
      } else if (!poolsToShieldSelectSapling && poolsToShieldSelectTransparent) {
        pools = 'transparent';
      }
    }

    if (pools === '') {
      return;
    }

    setComputingModalVisible(true);
    // We need to activate this flag because if the App is syncing
    // while shielding, then it going to finish the current batch
    // and after that it run the shield process.
    await RPC.rpc_setInterruptSyncAfterBatch('true');
    const shieldStr = await RPC.rpc_shieldFunds(pools);

    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith('error')) {
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate(`history.shield-title-${pools}`) as string,
          `${translate(`history.shield-error-${pools}`)} ${shieldStr}`,
          true,
        );
      } else {
        const shieldJSON: RPCShieldType = await JSON.parse(shieldStr);

        if (shieldJSON.error) {
          createAlert(
            setBackgroundError,
            addLastSnackbar,
            translate(`history.shield-title-${pools}`) as string,
            `${translate(`history.shield-error-${pools}`)} ${shieldJSON.error}`,
            true,
          );
        } else {
          createAlert(
            setBackgroundError,
            addLastSnackbar,
            translate(`history.shield-title-${pools}`) as string,
            `${translate(`history.shield-message-${pools}`)} ${shieldJSON.txid}`,
            true,
          );
        }
      }
      setComputingModalVisible(false);
      await RPC.rpc_setInterruptSyncAfterBatch('false');
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
    if (!noSyncingStatus) {
      if (syncingStatus.inProgress) {
        animation.start();
      } else {
        animation.stop();
      }
    }

    return () => {
      if (!noSyncingStatus) {
        animation.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncingStatus.inProgress, noSyncingStatus]);

  const onPressShieldFunds = () => {
    Alert.alert(
      translate(
        `history.shield-title-${
          poolsToShield !== 'all'
            ? poolsToShield
            : poolsToShieldSelectSapling && poolsToShieldSelectTransparent
            ? 'all'
            : poolsToShieldSelectSapling
            ? 'sapling'
            : poolsToShieldSelectTransparent
            ? 'transparent'
            : 'all'
        }`,
      ) as string,
      translate(
        `history.shield-alert-${
          poolsToShield !== 'all'
            ? poolsToShield
            : poolsToShieldSelectSapling && poolsToShieldSelectTransparent
            ? 'all'
            : poolsToShieldSelectSapling
            ? 'sapling'
            : poolsToShieldSelectTransparent
            ? 'transparent'
            : 'all'
        }`,
      ) as string,
      [
        { text: translate('confirm') as string, onPress: () => shieldFunds() },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: true, userInterfaceStyle: 'light' },
    );
  };

  const ufvkShowModal = async () => {
    const resultBio = security.ufvkScreen ? await simpleBiometrics({ translate: translate }) : true;
    // can be:
    // - true      -> the user do pass the authentication
    // - false     -> the user do NOT pass the authentication
    // - undefined -> no biometric authentication available -> Passcode.
    console.log('BIOMETRIC --------> ', resultBio);
    if (resultBio === false) {
      // snack with Error & closing the menu.
      if (addLastSnackbar) {
        addLastSnackbar({ message: translate('biometrics-error') as string, type: 'Primary' });
      }
    } else {
      if (setUfvkViewModalVisible) {
        setUfvkViewModalVisible(true);
      }
    }
  };

  //console.log('render header');

  return (
    <View
      testID="header"
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingBottom: 0,
        backgroundColor: colors.card,
        zIndex: -1,
        paddingTop: 10,
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
          height: 40,
        }}>
        {!noSyncingStatus && (
          <>
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
                    <View style={{ margin: 0, padding: 0 }}>
                      <FontAwesomeIcon icon={faCheck} color={colors.primary} size={20} />
                    </View>
                  </View>
                )}
                {!syncingStatus.inProgress &&
                  syncingStatus.lastBlockServer !== syncingStatus.lastBlockWallet &&
                  mode === 'advanced' && (
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 0,
                        marginRight: 5,
                        padding: 1,
                        borderColor: colors.zingo,
                        borderWidth: 1,
                        borderRadius: 10,
                        minWidth: 25,
                        minHeight: 25,
                      }}>
                      <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                        <FontAwesomeIcon icon={faPause} color={colors.zingo} size={17} />
                      </TouchableOpacity>
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
                      {mode === 'basic' ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                          <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={17} />
                          <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{`${blocksRemaining}`}</FadeText>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                            <FontAwesomeIcon icon={faPlay} color={colors.syncing} size={17} />
                            <FadeText style={{ fontSize: 10, marginLeft: 2 }}>{`${blocksRemaining}`}</FadeText>
                          </View>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  </View>
                )}
              </>
            ) : (
              <>
                {mode === 'advanced' && (
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
                    <Animated.View style={{ opacity: opacityValue, margin: 0, padding: 0 }}>
                      <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                        <FontAwesomeIcon icon={faWifi} color={colors.primaryDisabled} size={18} />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                )}
              </>
            )}
            {/*syncingStatus.inProgress && blocksRemaining > 0 && (
              <View style={{ marginRight: 5 }}>
                {mode === 'basic' ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <FadeText style={{ fontSize: 10 }}>{`${blocksRemaining}`}</FadeText>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                      <FadeText style={{ fontSize: 10 }}>{`${blocksRemaining}`}</FadeText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              )*/}
            {(!netInfo.isConnected || netInfo.type === NetInfoStateType.cellular || netInfo.isConnectionExpensive) && (
              <>
                {mode !== 'basic' && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                    <FontAwesomeIcon icon={faCloudDownload} color={!netInfo.isConnected ? 'red' : 'yellow'} size={20} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
        {mode !== 'basic' && !noPrivacy && set_privacy_option && addLastSnackbar && (
          <TouchableOpacity
            style={{ marginHorizontal: 5 }}
            onPress={() => {
              addLastSnackbar({
                message: `${translate('change-privacy')} ${
                  privacy
                    ? translate('settings.value-privacy-false')
                    : (((translate('settings.value-privacy-true') as string) +
                        translate('change-privacy-legend')) as string)
                }`,
                type: 'Primary',
              });
              set_privacy_option('privacy', !privacy);
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: privacy ? 2 : 1,
                  borderColor: privacy ? colors.primary : colors.primaryDisabled,
                  borderRadius: 5,
                  paddingHorizontal: 5,
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.border,
                    marginRight: 5,
                  }}>
                  {`${privacy ? translate('settings.value-privacy-true') : translate('settings.value-privacy-false')}`}
                </Text>
                {privacy ? (
                  <FontAwesomeIcon icon={faLock} size={14} color={colors.primary} />
                ) : (
                  <FontAwesomeIcon icon={faLockOpen} size={14} color={colors.primaryDisabled} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {noBalance && !receivedLegend && <View style={{ height: 20 }} />}
      {!noBalance && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            marginTop: readOnly ? 15 : 0,
          }}>
          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            color={colors.text}
            size={36}
            amtZec={totalBalance.total}
            privacy={privacy}
            smallPrefix={true}
          />
          {mode !== 'basic' &&
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

      {receivedLegend && totalBalance.total > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            marginTop: readOnly ? 15 : 0,
          }}>
          <RegText color={colors.primary}>{translate('seed.youreceived') as string}</RegText>
          <ZecAmount
            currencyName={info.currencyName ? info.currencyName : ''}
            color={colors.primary}
            size={18}
            amtZec={totalBalance.total}
            privacy={privacy}
          />
          <RegText color={colors.primary}>!!!</RegText>
        </View>
      )}

      {currency === 'USD' && !noBalance && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CurrencyAmount
            style={{ marginTop: 0, marginBottom: 5 }}
            price={zecPrice.zecPrice}
            amtZec={totalBalance.total}
            currency={currency}
            privacy={privacy}
          />
          <View style={{ marginLeft: 5 }}>
            <PriceFetcher setZecPrice={setZecPrice} />
          </View>
        </View>
      )}

      {showShieldButton && !!poolsToShield && setComputingModalVisible && (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <FadeText style={{ fontSize: 8 }}>
            {(translate(
              `history.shield-legend-${
                poolsToShield !== 'all'
                  ? poolsToShield
                  : poolsToShieldSelectSapling && poolsToShieldSelectTransparent
                  ? 'all'
                  : poolsToShieldSelectSapling
                  ? 'sapling'
                  : poolsToShieldSelectTransparent
                  ? 'transparent'
                  : 'all'
              }`,
            ) as string) +
              ` ${
                poolsToShield === 'sapling' && totalBalance.spendablePrivate > info.defaultFee
                  ? (totalBalance.spendablePrivate - info.defaultFee).toFixed(8)
                  : poolsToShield === 'transparent' &&
                    (someUnconfirmed ? 0 : totalBalance.transparentBal) > info.defaultFee
                  ? ((someUnconfirmed ? 0 : totalBalance.transparentBal) - info.defaultFee).toFixed(8)
                  : poolsToShieldSelectSapling &&
                    poolsToShieldSelectTransparent &&
                    totalBalance.spendablePrivate + (someUnconfirmed ? 0 : totalBalance.transparentBal) >
                      info.defaultFee
                  ? (
                      totalBalance.spendablePrivate +
                      (someUnconfirmed ? 0 : totalBalance.transparentBal) -
                      info.defaultFee
                    ).toFixed(8)
                  : poolsToShieldSelectSapling && totalBalance.spendablePrivate > info.defaultFee
                  ? (totalBalance.spendablePrivate - info.defaultFee).toFixed(8)
                  : poolsToShieldSelectTransparent &&
                    (someUnconfirmed ? 0 : totalBalance.transparentBal) > info.defaultFee
                  ? ((someUnconfirmed ? 0 : totalBalance.transparentBal) - info.defaultFee).toFixed(8)
                  : 0
              }`}
          </FadeText>
          <View style={{ margin: 5, flexDirection: 'row' }}>
            <Button
              type="Primary"
              title={
                translate(
                  `history.shield-${
                    poolsToShield !== 'all'
                      ? poolsToShield
                      : poolsToShieldSelectSapling && poolsToShieldSelectTransparent
                      ? 'all'
                      : poolsToShieldSelectSapling
                      ? 'sapling'
                      : poolsToShieldSelectTransparent
                      ? 'transparent'
                      : 'all'
                  }`,
                ) as string
              }
              onPress={onPressShieldFunds}
              disabled={
                poolsToShield === 'sapling' && totalBalance.spendablePrivate > info.defaultFee
                  ? false
                  : poolsToShield === 'transparent' &&
                    (someUnconfirmed ? 0 : totalBalance.transparentBal) > info.defaultFee
                  ? false
                  : poolsToShieldSelectSapling &&
                    poolsToShieldSelectTransparent &&
                    totalBalance.spendablePrivate + (someUnconfirmed ? 0 : totalBalance.transparentBal) >
                      info.defaultFee
                  ? false
                  : poolsToShieldSelectSapling && totalBalance.spendablePrivate > info.defaultFee
                  ? false
                  : poolsToShieldSelectTransparent &&
                    (someUnconfirmed ? 0 : totalBalance.transparentBal) > info.defaultFee
                  ? false
                  : true
              }
            />
            {mode !== 'basic' &&
              poolsToShield === 'all' &&
              setPoolsToShieldSelectSapling &&
              setPoolsToShieldSelectTransparent && (
                <View style={{ alignItems: 'flex-start' }}>
                  <TouchableOpacity
                    style={{ marginHorizontal: 10 }}
                    onPress={() => setPoolsToShieldSelectSapling(!poolsToShieldSelectSapling)}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: poolsToShieldSelectSapling ? 2 : 1,
                          borderColor: poolsToShieldSelectSapling ? colors.primary : colors.primaryDisabled,
                          borderRadius: 5,
                          paddingHorizontal: 5,
                        }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.border,
                            marginRight: 5,
                          }}>
                          {translate('history.shield-z') as string}
                        </Text>
                        {poolsToShieldSelectSapling ? (
                          <FontAwesomeIcon icon={faCheck} size={14} color={colors.primary} />
                        ) : (
                          <FontAwesomeIcon icon={faXmark} size={14} color={'red'} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ marginHorizontal: 10 }}
                    onPress={() => setPoolsToShieldSelectTransparent(!poolsToShieldSelectTransparent)}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 0,
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: poolsToShieldSelectTransparent ? 2 : 1,
                          borderColor: poolsToShieldSelectTransparent ? colors.primary : colors.primaryDisabled,
                          borderRadius: 5,
                          paddingHorizontal: 5,
                        }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.border,
                            marginRight: 5,
                          }}>
                          {translate('history.shield-t') as string}
                        </Text>
                        {poolsToShieldSelectTransparent ? (
                          <FontAwesomeIcon icon={faCheck} size={14} color={colors.primary} />
                        ) : (
                          <FontAwesomeIcon icon={faXmark} size={14} color={'red'} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
          </View>
        </View>
      )}

      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
        <RegText testID={testID} color={colors.money} style={{ paddingHorizontal: 5, marginBottom: 3 }}>
          {title}
        </RegText>
      </View>

      <View
        style={{
          padding: 11.5,
          position: 'absolute',
          left: 0,
          alignItems: 'flex-start',
        }}>
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
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
              !(mode === 'basic' && transactions.length <= 0) &&
              !(mode === 'basic' && totalBalance.total <= 0) ? (
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
          alignItems: 'flex-end',
        }}>
        <Image
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 38, height: 38, resizeMode: 'contain', borderRadius: 10 }}
        />
      </View>

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
    </View>
  );
};

export default Header;
