/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faCircleUser,
  faXmark,
  faMagnifyingGlassPlus,
  faPaperPlane,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

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
import BoldText from '../../Components/BoldText';
import Button from '../../Components/Button';
import MessageLine from './MessageLine';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import { useFullSheetSnapPoints } from '../../../app/hooks/useFullSheetSnapPoints';
import AddressItem from '../../Components/AddressItem';
import { sendEmail } from '../../../app/sendEmail';
import { createAlert } from '../../../app/createAlert';
import selectingServer from '../../../app/selectingServer';
import { serverUris } from '../../../app/uris';
import Utils from '../../../app/utils';
import { DrawerScreenProps } from '@react-navigation/drawer';

type MessageListProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Messages
> & {
  toggleMenuDrawer: () => void;
  setScrollToBottom: (value: boolean) => void;
  scrollToBottom: boolean;
  address?: string;
  closeScreen?: () => void;
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
  closeScreen,
  sendTransaction,
  setServerOption,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    messages,
    language,
    addLastSnackbar,
    addressBook,
    defaultUnifiedAddress,
    selectServer,
    netInfo,
    setBackgroundError,
    server,
    totalBalance,
    doRefresh,
    somePending,
    zingolibVersion,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.MessagesList;

  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [messagesSliced, setMessagesSliced] = useState<ValueTransferType[]>([]);
  const [messagesFiltered, setMessagesFiltered] = useState<ValueTransferType[]>(
    [],
  );
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [isScrollingToBottom, setIsScrollingToBottom] =
    useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firstScrollToBottomDone, setFirstScrollToBottomDone] =
    useState<boolean>(false);
  const [scrollViewHeight, setScrollViewHeight] = useState<number>(0);
  const [contentScrollViewHeight, setContentScrollViewHeight] =
    useState<number>(0);
  const [scrollable, setScrollable] = useState<boolean>(false);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [disableSend, setDisableSend] = useState<boolean>(false);
  const [memoFieldHeight, setMemoFieldHeight] = useState<number>(48 + 30);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [spendable, setSpendable] = useState<number>(0);
  const [memo, setMemo] = useState<string>('');
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const messagesSheetRef = useRef<BottomSheet>(null);

  const messagesSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderMessagesHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {closeScreen ? (
            <TouchableOpacity
              onPress={closeScreen}
              hitSlop={8}
              style={{ paddingHorizontal: 4, paddingVertical: 4 }}
            >
              <FontAwesomeIcon
                icon={faChevronLeft}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
            {translate('messages.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [closeScreen, colors, translate],
  );

  var lastMonth = '';

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const getIcon = () => {
    return faCircleUser;
  };

  const getLabelAndColor = (addr: string) => {
    const contact = addressBook.filter(
      (ab: AddressBookFileClass) => ab.address === addr,
    );
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
      color = contact[0].color
        ? contact[0].color
        : Utils.generateColorList(1)[0];
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

  const fetchMessagesFiltered = useMemo(() => {
    if (!messages) {
      return [] as ValueTransferType[];
    }
    if (address) {
      // filtering for this address
      return messages.filter((a: ValueTransferType) =>
        addressFilter(a.address, a.memos),
      );
    } else {
      return messages;
    }
  }, [messages, address, addressFilter]);

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
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

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
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const isBottom =
        Math.round(contentOffset.y) >=
          Math.round(contentSize.height - layoutMeasurement.height - 100) &&
        scrollable;

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
        if (!customError && selectServer !== SelectServerEnum.custom) {
          // try send again with a working server
          const serverChecked = await selectingServer(
            serverUris(translate).filter((s: ServerUrisType) => !s.obsolete),
          );
          let fasterServer: ServerType = {} as ServerType;
          if (serverChecked && serverChecked.latency) {
            fasterServer = {
              uri: serverChecked.uri,
              chainName: serverChecked.chainName,
            };
          } else {
            fasterServer = server;
            // likely here there is a internet conection problem
            // all of the servers return an error because they are unreachable probably.
            // the 15 seconds timout was fired.
          }
          console.log(serverChecked);
          console.log(fasterServer);
          if (fasterServer.uri !== server.uri) {
            setServerOption(fasterServer, selectServer, false, true);
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

  // Memo expand was previously a separate Drawer screen; MessageList is not in
  // active use right now, so this is left as a no-op until the chat flow comes
  // back. When restored, inline a BottomSheetModal similar to the one in Send.
  const setMemoModalShow = () => {};

  const setValueTransferDetailModalShow = useCallback(
    async (index: number, vt: ValueTransferType) => {
      navigation.navigate(RouteEnum.ValueTransferDetailStack, {
        screen: RouteEnum.ValueTransferDetail,
        params: {
          index: index,
          vt: vt,
          valueTransfersSliced: messagesSliced,
          totalLength: messagesFiltered ? messagesFiltered.length : 0,
          from: RouteEnum.Messages,
        },
      });
    },
    [navigation, messagesSliced, messagesFiltered],
  );

  //if (address) {
  //  console.log('render Messages', validMemo, 'memo local:', memo);
  //}

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === GlobalConst.platformOSios ? 10 : 0
      }
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        onLayout={e => setContainerH(e.nativeEvent.layout.height)}
      >
        <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
          <Header
            title={''}
            screenName={screenName}
            toggleMenuDrawer={toggleMenuDrawer}
            noBalance={true}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar /* context */}
          />
        </View>
        <BottomSheet
          ref={messagesSheetRef}
          snapPoints={messagesSnapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderMessagesHandle}
        >
          <BottomSheetView
            accessible={true}
            accessibilityLabel={translate('history.title-acc') as string}
            style={{
              flex: 1,
              backgroundColor: colors.bottomSheetBackground,
            }}
          >
            <View
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                width: '100%',
                height: address
                  ? `${
                      100 -
                      ((memoFieldHeight +
                        (keyboardVisible
                          ? Platform.OS === GlobalConst.platformOSandroid
                            ? 40
                            : 60
                          : 0)) *
                        100) /
                        dimensions.height
                    }%`
                  : '100%',
              }}
            >
              {!!address && (
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
                    }}
                  >
                    <View style={{ minWidth: 50, marginRight: 5 }}>
                      {!getLabelAndColor(address).initials ? (
                        <FontAwesomeIcon
                          style={{
                            marginLeft: 5,
                            marginRight: 5,
                            marginTop: 0,
                          }}
                          size={32}
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
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: 'bold',
                              fontSize: 20,
                              color: Utils.getLabelColor(
                                getLabelAndColor(address).color,
                              ),
                            }}
                          >{`${getLabelAndColor(address).initials}`}</Text>
                        </View>
                      )}
                    </View>
                    <AddressItem
                      address={address}
                      screenName={screenName}
                      oneLine={true}
                      withIcon={true}
                    />
                  </View>
                </>
              )}
              {(loading || !firstScrollToBottomDone) && (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={{ marginVertical: 20 }}
                />
              )}
              <ScrollView
                ref={scrollViewRef}
                bounces={false}
                alwaysBounceVertical={false}
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
                }}
              >
                {loadMoreButton && (
                  <View
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      marginTop: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Button
                      type={ButtonTypeEnum.Secondary}
                      title={translate('history.loadmore') as string}
                      onPress={loadMoreClicked}
                    />
                  </View>
                )}

                {!loadMoreButton &&
                  !!messagesSliced &&
                  !messagesSliced.length && (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <FadeText style={{ color: colors.primary }}>
                        {translate('messages.empty') as string}
                      </FadeText>
                    </View>
                  )}

                {messagesSliced &&
                  messagesSliced.length > 0 &&
                  messagesSliced.map((vt, index) => {
                    let txmonth = vt.time
                      ? Utils.formatDate(vt.time * 1000, 'MMM yyyy', language)
                      : '--- ----';

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
                        setValueTransferDetailModalShow={
                          setValueTransferDetailModalShow
                        }
                        messageAddress={address}
                        screenName={screenName}
                      />
                    );
                  })}
                {!loadMoreButton &&
                  !!messagesSliced &&
                  !!messagesSliced.length && (
                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <FadeText style={{ color: colors.primary }}>
                        {translate('history.end') as string}
                      </FadeText>
                    </View>
                  )}
                <View style={{ marginBottom: 10 }} />
              </ScrollView>
              {!isAtBottom &&
                scrollable &&
                !loading &&
                firstScrollToBottomDone && (
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
                    })}
                  >
                    <FontAwesomeIcon
                      style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                      size={16}
                      icon={faAngleDown}
                      color={colors.zingo}
                    />
                  </Pressable>
                )}
            </View>
            {!loading &&
              firstScrollToBottomDone &&
              address &&
              selectServer !== SelectServerEnum.offline && (
                <View
                  style={{
                    height: `${
                      ((memoFieldHeight +
                        (keyboardVisible
                          ? Platform.OS === GlobalConst.platformOSandroid
                            ? 40
                            : 60
                          : 0)) *
                        100) /
                      dimensions.height
                    }%`,
                  }}
                >
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      margin: 10,
                    }}
                  >
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
                      }}
                    >
                      <TextInput
                        placeholder={
                          stillConfirming
                            ? (translate('send.somefunds') as string)
                            : spendable > 0
                              ? (translate(
                                  'messages.message-placeholder',
                                ) as string)
                              : (translate(
                                  'messages.message-placeholder-error',
                                ) as string)
                        }
                        placeholderTextColor={
                          spendable > 0 ? colors.placeholder : colors.primary
                        }
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
                        onEndEditing={(
                          e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                        ) => {
                          if (e.nativeEvent.text !== memo) {
                            setMemo(e.nativeEvent.text);
                          }
                        }}
                        editable={!disableSend && spendable > 0}
                        onContentSizeChange={(
                          e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
                        ) => {
                          //console.log(e.nativeEvent.contentSize.height);
                          if (e.nativeEvent.contentSize.height < 48) {
                            setMemoFieldHeight(48 + 30);
                          } else if (e.nativeEvent.contentSize.height < 90) {
                            setMemoFieldHeight(
                              e.nativeEvent.contentSize.height + 30,
                            );
                          } else {
                            setMemoFieldHeight(90 + 30);
                          }
                          if (
                            e.nativeEvent.contentSize.height >
                              (Platform.OS === GlobalConst.platformOSandroid
                                ? 70
                                : 35) &&
                            !memoIcon
                          ) {
                            setMemoIcon(true);
                          }
                          if (
                            e.nativeEvent.contentSize.height <=
                              (Platform.OS === GlobalConst.platformOSandroid
                                ? 70
                                : 35) &&
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
                          size={20}
                          color={colors.primaryDisabled}
                        />
                      )}
                      {!!memo && !disableSend && (
                        <TouchableOpacity
                          onPress={() => {
                            setMemo('');
                          }}
                        >
                          <FontAwesomeIcon
                            style={{
                              marginTop: 7,
                              marginRight: memoIcon ? 0 : 7,
                            }}
                            size={20}
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
                          }}
                        >
                          <FontAwesomeIcon
                            style={{ margin: 7 }}
                            size={24}
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
                              addLastSnackbar(
                                translate(
                                  'loadedapp.connection-error',
                                ) as string,
                              );
                              return;
                            }
                            confirmSend();
                          }}
                        >
                          <FontAwesomeIcon
                            size={24}
                            icon={faPaperPlane}
                            color={colors.primary}
                          />
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
                      }}
                    >
                      <FadeText
                        style={{
                          marginTop: 0,
                          fontWeight: 'bold',
                          fontSize: 12.5,
                          color: 'red',
                        }}
                      >{`${Utils.countMemoBytes(memo, true, defaultUnifiedAddress)} `}</FadeText>
                      <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                        {translate('loadedapp.of') as string}
                      </FadeText>
                      <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                        {' ' + GlobalConst.memoMaxLength.toString() + ' '}
                      </FadeText>
                    </View>
                  )}
                </View>
              )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </KeyboardAvoidingView>
  );
};

export default React.memo(MessageList);
