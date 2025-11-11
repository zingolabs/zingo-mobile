/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  TextInput,
  Platform,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  TextInputEndEditingEventData,
  TextInputContentSizeChangeEventData,
  Pressable,
} from 'react-native';
import moment from 'moment';

import { useNavigation, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleUser,
  faXmark,
  faMagnifyingGlassPlus,
  faPaperPlane,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';

import {
  AddressBookFileClass,
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  SendPageStateClass,
  ServerType,
  ServerUrisType,
  ToAddrClass,
  ValueTransferType,
} from '../../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../../app/types';
import FadeText from '../../Components/FadeText';
import Button from '../../Components/Button';
import MessageLine from './MessageLine';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import AddressItem from '../../Components/AddressItem';
import { sendEmail } from '../../../app/sendEmail';
import { createAlert } from '../../../app/createAlert';
import selectingServer from '../../../app/selectingServer';
import { serverUris } from '../../../app/uris';
import Utils from '../../../app/utils';
import { ToastProvider } from 'react-native-toastier';
import Snackbars from '../../Components/Snackbars';
import { DrawerScreenProps } from '@react-navigation/drawer';

type MessageListProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Messages> & {
  toggleMenuDrawer: () => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address?: string;
  closeModal?: () => void;
  sendTransaction?: (s: SendPageStateClass) => Promise<String>;
  setServerOption?: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
};

const MessageList: React.FunctionComponent<MessageListProps> = ({
  toggleMenuDrawer,
  setScrollToBottom,
  scrollToBottom,
  address,
  sendTransaction,
  setServerOption,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    messages,
    language,
    addLastSnackbar,
    addressBook,
    defaultUnifiedAddress,
    selectLightWalletServer,
    netInfo,
    setBackgroundError,
    lightWalletserver,
    totalBalance,
    doRefresh,
    somePending,
    zingolibVersion,
    snackbars,
    removeFirstSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.MessagesList;

  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [messagesSliced, setMessagesSliced] = useState<ValueTransferType[]>([]);
  const [messagesFiltered, setMessagesFiltered] = useState<ValueTransferType[]>([]);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [isScrollingToBottom, setIsScrollingToBottom] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firstScrollToBottomDone, setFirstScrollToBottomDone] = useState<boolean>(false);
  const [scrollViewHeight, setScrollViewHeight] = useState<number>(0);
  const [contentScrollViewHeight, setContentScrollViewHeight] = useState<number>(0);
  const [scrollable, setScrollable] = useState<boolean>(false);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [disableSend, setDisableSend] = useState<boolean>(false);
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [memoFieldHeight, setMemoFieldHeight] = useState<number>(48 + 30);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [spendable, setSpendable] = useState<number>(0);
  const [memo, setMemo] = useState<string>('');
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  var lastMonth = '';

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const getIcon = () => {
    return faCircleUser;
  };

  const getLabelAndColor = (addr: string) => {
    const contact = addressBook.filter((ab: AddressBookFileClass) => ab.address === addr);
    let initials = null;
    let color = '';
    if (contact.length === 1) {
      const words = contact[0].label
        .trim()
        .split(' ')
        .filter((w: string) => !!w);
      //console.log(words);
      if (words[0]) {
        initials = words[0].charAt(0).toUpperCase();
      }
      if (words[1]) {
        initials = initials + words[1].charAt(0).toUpperCase();
      }
      color = contact[0].color ? contact[0].color : Utils.generateColorList(1)[0];
    }
    return { initials, color };
  };

  const addressFilter = useMemo(
    () => (addr: string | undefined, memos: string[] | undefined) => {
      if (!memos || memos.length === 0) {
        return false;
      }
      const { memoUA } = Utils.splitMemo(memos);
      // checking address
      // from the same contact in the Address Book.
      return addr === address || memoUA === address;
    },
    [address],
  );

  const anonymousFilter = useMemo(
    () => (addr: string | undefined, memos: string[] | undefined) => {
      if (!memos || memos.length === 0) {
        return false;
      }
      const { memoUA } = Utils.splitMemo(memos);
      // checking address
      // from the same contact in the Address Book.
      return !addr && !memoUA;
    },
    [],
  );

  const fetchMessagesFiltered = useMemo(() => {
    if (!messages) {
      return [] as ValueTransferType[];
    }
    if (address) {
      // filtering for this address
      return messages.filter((a: ValueTransferType) => addressFilter(a.address, a.memos));
    } else if (anonymous) {
      // filtering for anonymous messages
      return messages.filter((a: ValueTransferType) => anonymousFilter(a.address, a.memos));
    } else {
      return messages;
    }
  }, [messages, address, anonymous, addressFilter, anonymousFilter]);

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  useEffect(() => {
    if (messages !== null) {
      const vtf = fetchMessagesFiltered;
      setLoadMoreButton(numVt < vtf.length);
      setMessagesFiltered(vtf);
      setMessagesSliced(vtf.slice(-numVt));
      if (loading) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    }
    // if change numVt don't need to apply the filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFilter, loading, messages, fetchMessagesFiltered]);

  useEffect(() => {
    setLoadMoreButton(numVt < messagesFiltered.length);
    setMessagesSliced(messagesFiltered.slice(-numVt));
  }, [numVt, messagesFiltered]);

  const handleScrollToBottom = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToBottom) {
      setIsScrollingToBottom(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to bottom immediately for UI feedback
      setIsAtBottom(true);

      // Scroll to bottom
      scrollViewRef.current.scrollToEnd({ animated: true });

      // Set timeout to reset scrolling state
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingToBottom(false);
        setScrollToBottom(false);
        // Double-check position after scroll animation
        if (scrollViewRef.current) {
          setIsAtBottom(true); // For ScrollView, assume success
        }
      }, 800);
    }
  }, [isScrollingToBottom, setScrollToBottom]);

  useEffect(() => {
    if (scrollToBottom && !isScrollingToBottom) {
      handleScrollToBottom();
    }
  }, [scrollToBottom, isScrollingToBottom, handleScrollToBottom]);

  useEffect(() => {
    if (!loading) {
      if (!messagesSliced || !messagesSliced.length) {
        setFirstScrollToBottomDone(true);
      } else {
        //console.log('scroll bottom');
        handleScrollToBottom();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    //console.log(scrollViewHeight, contentScrollViewHeight);
    if (contentScrollViewHeight > 0 && scrollViewHeight > 0) {
      //setIsAtBottom(false);
      if (contentScrollViewHeight >= scrollViewHeight) {
        //console.log('SCROLLABLE >>>>>>>>>>>>>');
        setScrollable(true);
      } else {
        setScrollable(false);
      }
      //console.log('first scroll bottom done');
      setFirstScrollToBottomDone(true);
    }
  }, [contentScrollViewHeight, scrollViewHeight]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (memo) {
      setMemo(memo);
      const len = Utils.countMemoBytes(memo, true, defaultUnifiedAddress);
      if (len > GlobalConst.memoMaxLength) {
        setValidMemo(-1);
      } else {
        setValidMemo(1);
      }
    } else {
      setValidMemo(0);
    }
  }, [memo, defaultUnifiedAddress]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const isBottom =
        Math.round(contentOffset.y) >= Math.round(contentSize.height - layoutMeasurement.height - 100) && scrollable;

      // If we're scrolling to bottom and we've reached the bottom, stop the scrolling state
      if (isScrollingToBottom && isBottom) {
        setIsScrollingToBottom(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }

      // Always update isAtBottom for manual scrolling
      setIsAtBottom(isBottom);

      if (isBottom && !firstScrollToBottomDone) {
        setFirstScrollToBottomDone(true);
      }
    },
    [isScrollingToBottom, scrollable, firstScrollToBottomDone],
  );

  const buildSendState = (memoPar: string) => {
    // Create the new state object
    const newState = new SendPageStateClass(new ToAddrClass(0));
    // EMPTY
    const newToAddr = newState.toaddr;
    // Find the correct toAddr
    const toAddr = newToAddr;

    toAddr.to = address ? address : '';
    toAddr.amount = '0';
    toAddr.amountCurrency = '0';
    toAddr.includeUAMemo = true;
    toAddr.memo = memoPar;

    newState.toaddr = newToAddr;
    return newState;
  };

  const interceptCustomError = (error: string) => {
    // these error are not server related.
    if (
      error.includes('18: bad-txns-sapling-duplicate-nullifier') ||
      error.includes('18: bad-txns-sprout-duplicate-nullifier') ||
      error.includes('18: bad-txns-orchard-duplicate-nullifier')
    ) {
      // bad-txns-xxxxxxxxx-duplicate-nullifier (3 errors)
      return translate('send.duplicate-nullifier-error') as string;
    } else if (error.includes('64: dust')) {
      // dust
      return translate('send.dust-error') as string;
    }
  };

  const confirmSend = async () => {
    if (!memo) {
      return;
    }
    if (!sendTransaction || !setServerOption) {
      return;
    }
    setDisableSend(true);

    // call the sendTransaction method in a timeout, allowing the modals to show properly
    setTimeout(async () => {
      let error = '';
      let customError: string | undefined;
      try {
        await sendTransaction(buildSendState(memo));

        // Clear the fields
        setMemo('');

        // scroll to top in history, just in case.
        setScrollToBottom(true);

        // the app send successfully on the first attemp.
        setDisableSend(false);

        return;
      } catch (err1) {
        error = err1 as string;

        customError = interceptCustomError(error);

        // in this point the App is failing, there is two possibilities:
        // 1. Server Error
        // 2. Another type of Error
        // here is worth it to try again with the best working server...
        // if the user selected a `custom` server, then we cannot change it.
        if (!customError && selectLightWalletServer !== SelectServerEnum.custom) {
          // try send again with a working server
          const serverChecked = await selectingServer(serverUris(translate).filter((s: ServerUrisType) => !s.obsolete));
          let fasterServer: ServerType = {} as ServerType;
          if (serverChecked && serverChecked.latency) {
            fasterServer = { uri: serverChecked.uri, chainName: serverChecked.chainName };
          } else {
            fasterServer = lightWalletserver;
            // likely here there is a internet conection problem
            // all of the servers return an error because they are unreachable probably.
            // the 30 seconds timout was fired.
          }
          console.log(serverChecked);
          console.log(fasterServer);
          if (fasterServer.uri !== lightWalletserver.uri) {
            setServerOption(fasterServer, selectLightWalletServer, false, true);
          }

          try {
            await sendTransaction(buildSendState(memo));

            // Clear the fields
            setMemo('');

            // scroll to top in history, just in case.
            setScrollToBottom(true);

            // the app send successfully on the second attemp.
            setDisableSend(false);

            return;
          } catch (err2) {
            error = err2 as string;

            customError = interceptCustomError(error);
          }
        }
      }

      //console.log('sendtx error', error);
      // if the App is in background I need to store the error
      // and when the App come back to foreground shows it to the user.
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        translate('send.sending-error') as string,
        `${customError ? customError : error}`,
        false,
        translate,
        sendEmail,
        zingolibVersion,
      );
      setDisableSend(false);
    });
  };

  useEffect(() => {
    const stillConf =
      (totalBalance ? totalBalance.totalOrchardBalance : 0) !==
        (totalBalance ? totalBalance.confirmedOrchardBalance : 0) ||
      (totalBalance ? totalBalance.totalSaplingBalance : 0) !==
        (totalBalance ? totalBalance.confirmedSaplingBalance : 0) ||
      somePending;
    //const showUpgrade =
    //  (somePending ? 0 : totalBalance.transparentBal) === 0 && totalBalance.spendablePrivate > fee;
    setStillConfirming(stillConf);
    // because the action is related with `send`.
    setSpendable(totalBalance ? totalBalance.totalSpendableBalance : 0);
  }, [
    somePending,
    totalBalance,
    totalBalance?.totalOrchardBalance,
    totalBalance?.totalSaplingBalance,
    totalBalance?.totalSpendableBalance,
  ]);

  const setMemoModalShow = () => {
    navigation.navigate(RouteEnum.Memo, { 
      message: memo,
      includeUAMessage: true,
      setMessage: setMemo,
    });
  };

  const setValueTransferDetailModalShow = async (index: number, vt: ValueTransferType) => {
    navigation.navigate(RouteEnum.ValueTransferDetailStack, {
      screen: RouteEnum.ValueTransferDetail,
      params: {
        index: index,
        vt: vt,
        valueTransfersSliced: messagesSliced,
        totalLength: messagesFiltered ? messagesFiltered.length : 0,
      }
    });
  };

  //if (address) {
  //  console.log('render Messages', validMemo, 'memo local:', memo);
  //}

  return (
    <ToastProvider>
      <Snackbars snackbars={snackbars} removeFirstSnackbar={removeFirstSnackbar} screenName={screenName} />

      <KeyboardAvoidingView
        behavior={Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === GlobalConst.platformOSios ? 10 : 0}
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
          }}>
          <View
            accessible={true}
            accessibilityLabel={translate('history.title-acc') as string}
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              width: '100%',
              height: address
                ? `${
                    100 -
                    ((memoFieldHeight +
                      (keyboardVisible ? (Platform.OS === GlobalConst.platformOSandroid ? 40 : 60) : 0)) *
                      100) /
                      dimensions.height
                  }%`
                : '100%',
            }}>
            <Header
              title={translate('messages.title') as string}
              screenName={screenName}
              toggleMenuDrawer={toggleMenuDrawer}
              noBalance={true}
              setPrivacyOption={setPrivacyOption}
              addLastSnackbar={addLastSnackbar /* context */}
            />
            {address ? (
              <>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: 10,
                    marginTop: 20,
                    marginBottom: 10,
                  }}>
                  <View style={{ minWidth: 50, marginRight: 5 }}>
                    {!getLabelAndColor(address).initials ? (
                      <FontAwesomeIcon
                        style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                        size={40}
                        icon={getIcon()}
                        color={colors.text}
                      />
                    ) : (
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          backgroundColor: getLabelAndColor(address).color,
                          borderColor: colors.zingo,
                          borderWidth: 2,
                          borderRadius: 22,
                          marginLeft: 5,
                          marginRight: 5,
                          marginTop: 0,
                        }}>
                        <Text
                          style={{
                            fontWeight: 'bold',
                            fontSize: 20,
                            color: Utils.getLabelColor(getLabelAndColor(address).color),
                          }}>{`${getLabelAndColor(address).initials}`}</Text>
                      </View>
                    )}
                  </View>
                  <AddressItem address={address} screenName={screenName} oneLine={true} withIcon={true} />
                </View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', margin: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setAnonymous(false);
                      setLoading(true);
                    }}>
                    <View
                      style={{
                        backgroundColor: !anonymous ? colors.primary : colors.sideMenuBackground,
                        borderRadius: 15,
                        borderColor: !anonymous ? colors.primary : colors.zingo,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        marginHorizontal: 10,
                      }}>
                      <FadeText
                        style={{
                          color: !anonymous ? colors.sideMenuBackground : colors.zingo,
                          fontWeight: 'bold',
                        }}>
                        {translate('messages.link-all') as string}
                      </FadeText>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setAnonymous(true);
                      setLoading(true);
                    }}>
                    <View
                      style={{
                        backgroundColor: anonymous ? colors.primary : colors.sideMenuBackground,
                        borderRadius: 15,
                        borderColor: anonymous ? colors.primary : colors.zingo,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        marginHorizontal: 0,
                      }}>
                      <FadeText
                        style={{
                          color: anonymous ? colors.sideMenuBackground : colors.zingo,
                          fontWeight: 'bold',
                        }}>
                        {translate('messages.link-anonymous') as string}
                      </FadeText>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {(loading || !firstScrollToBottomDone) && (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            )}
            <ScrollView
              ref={scrollViewRef}
              onScroll={handleScroll}
              onLayout={e => {
                const { height } = e.nativeEvent.layout;
                //console.log('layout HEIGHT >>>>>>>>>>>>>', height);
                setScrollViewHeight(height);
              }}
              onContentSizeChange={(_w: number, h: number) => {
                //console.log('content HEIGHT >>>>>>>>>>>>>', h);
                setContentScrollViewHeight(h);
              }}
              scrollEventThrottle={100}
              accessible={true}
              accessibilityLabel={translate('history.list-acc') as string}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={() => doRefresh(screenName)}
                  tintColor={colors.text}
                  title={translate('history.refreshing') as string}
                />
              }
              style={{
                flexGrow: 1,
                marginTop: 10,
                width: '100%',
                opacity: loading || !firstScrollToBottomDone ? 0 : 1,
              }}>
              {loadMoreButton ? (
                <View
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    marginTop: 10,
                    marginBottom: 10,
                  }}>
                  <Button
                    type={ButtonTypeEnum.Secondary}
                    title={translate('history.loadmore') as string}
                    onPress={loadMoreClicked}
                  />
                </View>
              ) : (
                <>
                  {!!messagesSliced && !!messagesSliced.length ? (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                      }}>
                      <FadeText style={{ color: colors.primary }}>{translate('history.end') as string}</FadeText>
                    </View>
                  ) : (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                      }}>
                      <FadeText style={{ color: colors.primary }}>{translate('messages.empty') as string}</FadeText>
                    </View>
                  )}
                </>
              )}

              {messagesSliced &&
                messagesSliced.length > 0 &&
                messagesSliced.map((vt, index) => {
                  let txmonth = vt.time ? moment(vt.time * 1000).format('MMM YYYY') : '--- ----';

                  var month = '';
                  if (txmonth !== lastMonth) {
                    month = txmonth;
                    lastMonth = txmonth;
                  }

                  return (
                    <MessageLine
                      key={`${index}-${vt.txid}-${vt.kind}`}
                      index={index}
                      vt={vt}
                      month={month}
                      setValueTransferDetailModalShow={setValueTransferDetailModalShow}
                      messageAddress={address}
                      screenName={screenName}
                    />
                  );
                })}
              <View style={{ marginBottom: 10 }} />
            </ScrollView>
            {!isAtBottom && scrollable && !loading && firstScrollToBottomDone && (
              <Pressable
                onPress={handleScrollToBottom}
                disabled={isScrollingToBottom}
                style={({ pressed }) => ({
                  position: 'absolute',
                  bottom: 30,
                  right: 10,
                  paddingHorizontal: 5,
                  paddingVertical: 10,
                  backgroundColor: colors.sideMenuBackground,
                  borderRadius: 50,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  borderWidth: 1,
                  borderColor: colors.zingo,
                  opacity: isScrollingToBottom ? 0.5 : 1,
                })}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={20}
                  icon={faAngleDown}
                  color={colors.zingo}
                />
              </Pressable>
            )}
          </View>
          {!loading && firstScrollToBottomDone && address && selectLightWalletServer !== SelectServerEnum.offline && (
            <View
              style={{
                height: `${
                  ((memoFieldHeight +
                    (keyboardVisible ? (Platform.OS === GlobalConst.platformOSandroid ? 40 : 60) : 0)) *
                    100) /
                  dimensions.height
                }%`,
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  margin: 10,
                }}>
                <View
                  accessible={true}
                  accessibilityLabel={translate('send.memo-acc') as string}
                  style={{
                    flexGrow: 1,
                    flexDirection: 'row',
                    borderWidth: 2,
                    borderRadius: 5,
                    borderColor: colors.text,
                    minHeight: 48,
                    maxHeight: 90,
                  }}>
                  <TextInput
                    placeholder={
                      stillConfirming
                        ? (translate('send.somefunds') as string)
                        : spendable > 0
                        ? (translate('messages.message-placeholder') as string)
                        : (translate('messages.message-placeholder-error') as string)
                    }
                    placeholderTextColor={spendable > 0 ? colors.placeholder : colors.primary}
                    multiline
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontWeight: '600',
                      fontSize: 14,
                      minHeight: 48,
                      maxHeight: 90,
                      marginLeft: 5,
                      backgroundColor: 'transparent',
                      textAlignVertical: 'top',
                    }}
                    value={memo}
                    onChangeText={(text: string) => {
                      if (text !== memo) {
                        setMemo(text);
                      }
                    }}
                    onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
                      if (e.nativeEvent.text !== memo) {
                        setMemo(e.nativeEvent.text);
                      }
                    }}
                    editable={!disableSend && spendable > 0}
                    onContentSizeChange={(e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
                      //console.log(e.nativeEvent.contentSize.height);
                      if (e.nativeEvent.contentSize.height < 48) {
                        setMemoFieldHeight(48 + 30);
                      } else if (e.nativeEvent.contentSize.height < 90) {
                        setMemoFieldHeight(e.nativeEvent.contentSize.height + 30);
                      } else {
                        setMemoFieldHeight(90 + 30);
                      }
                      if (
                        e.nativeEvent.contentSize.height > (Platform.OS === GlobalConst.platformOSandroid ? 70 : 35) &&
                        !memoIcon
                      ) {
                        setMemoIcon(true);
                      }
                      if (
                        e.nativeEvent.contentSize.height <= (Platform.OS === GlobalConst.platformOSandroid ? 70 : 35) &&
                        memoIcon
                      ) {
                        setMemoIcon(false);
                      }
                    }}
                    maxLength={GlobalConst.memoMaxLength}
                  />
                  {disableSend && (
                    <ActivityIndicator
                      style={{ marginTop: 7, marginRight: 7 }}
                      size={25}
                      color={colors.primaryDisabled}
                    />
                  )}
                  {!!memo && !disableSend && (
                    <TouchableOpacity
                      onPress={() => {
                        setMemo('');
                      }}>
                      <FontAwesomeIcon
                        style={{ marginTop: 7, marginRight: memoIcon ? 0 : 7 }}
                        size={25}
                        icon={faXmark}
                        color={colors.primaryDisabled}
                      />
                    </TouchableOpacity>
                  )}
                  {!!memoIcon && !disableSend && (
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setMemoModalShow();
                      }}>
                      <FontAwesomeIcon
                        style={{ margin: 7 }}
                        size={30}
                        icon={faMagnifyingGlassPlus}
                        color={colors.border}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {validMemo === 1 && !disableSend && (
                  <View style={{ alignSelf: 'center', marginLeft: 10 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!netInfo.isConnected) {
                          addLastSnackbar({
                            message: translate('loadedapp.connection-error') as string,
                            screenName: [screenName],
                          });
                          return;
                        }
                        confirmSend();
                      }}>
                      <FontAwesomeIcon size={30} icon={faPaperPlane} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {validMemo === -1 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginRight: 10,
                    marginTop: -28,
                  }}>
                  <FadeText
                    style={{
                      marginTop: 0,
                      fontWeight: 'bold',
                      fontSize: 12.5,
                      color: 'red',
                    }}>{`${Utils.countMemoBytes(memo, true, defaultUnifiedAddress)} `}</FadeText>
                  <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>{translate('loadedapp.of') as string}</FadeText>
                  <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                    {' ' + GlobalConst.memoMaxLength.toString() + ' '}
                  </FadeText>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default React.memo(MessageList);
