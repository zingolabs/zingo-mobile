/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  IconDefinition,
  faDotCircle,
  faXmark,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import {
  SelectServerEnum,
  ChainNameEnum,
  CurrencyNameEnum,
  GlobalConst,
  ServerType,
  ServerUrisType,
  InfoType,
  TranslateType,
} from '../../app/AppState';
import { ThemeType } from '../../app/types';
import { serverUris, parseServerURI, fetchServerList } from '../../app/uris';
import { getLatestBlockServerInfo } from '../../app/walletBackend';
import FadeText from './FadeText';
import RegText from './RegText';
import SelectBottomSheet from './SelectBottomSheet';
import ChainTypeToggle from './ChainTypeToggle';

export type ServerSelection = {
  selectServer: SelectServerEnum;
  uri: string;
  chainName: string;
};

type ServerSelectorProps = {
  // The server/mode currently active in the host (Settings: context; onboarding:
  // LoadingApp state). Used to seed the UI and as the "active" reference.
  activeServer: ServerType;
  activeSelectServer: SelectServerEnum;
  // Info of the currently-CONNECTED server (Settings has a wallet; onboarding
  // passes undefined → the header is built purely from a wallet-less probe).
  info?: InfoType;
  disabled: boolean;
  translate: (key: string) => TranslateType;
  // Fired whenever the effective selection changes so the host can persist it
  // on its own Save button. The host does NOT own the UI state.
  onChange: (selection: ServerSelection) => void;
};

const blankInfo = (
  uri: string,
  latestBlock: number,
  chainName: string,
): InfoType => ({
  serverUri: uri,
  chainName: chainName as ChainNameEnum,
  latestBlock,
  version: '',
  currencyName:
    chainName === ChainNameEnum.mainChainName
      ? CurrencyNameEnum.ZEC
      : CurrencyNameEnum.TAZ,
});

const ServerSelector: React.FunctionComponent<ServerSelectorProps> = ({
  activeServer,
  activeSelectServer,
  info,
  disabled,
  translate,
  onChange,
}) => {
  const { colors } = useTheme() as ThemeType;

  const [selectServer, setSelectServer] =
    useState<SelectServerEnum>(activeSelectServer);
  const [autoServerUri, setAutoServerUri] = useState<string>('');
  const [autoServerChainName, setAutoServerChainName] = useState<string>('');
  const [listServerUri, setListServerUri] = useState<string>('');
  const [listServerChainName, setListServerChainName] = useState<string>('');
  const [customServerUri, setCustomServerUri] = useState<string>('');
  const [customServerChainName, setCustomServerChainName] =
    useState<string>('');
  const [itemsPicker, setItemsPicker] = useState<
    { label: string; value: string }[]
  >([]);

  const [offlineIcon, setOfflineIcon] = useState<IconDefinition>(farCircle);
  const [autoIcon, setAutoIcon] = useState<IconDefinition>(farCircle);
  const [listIcon, setListIcon] = useState<IconDefinition>(farCircle);
  const [customIcon, setCustomIcon] = useState<IconDefinition>(farCircle);

  const [selectedInfo, setSelectedInfo] = useState<InfoType>(
    info ?? blankInfo(activeServer.uri, 0, activeServer.chainName),
  );
  const [selectedServerActive, setSelectedServerActive] = useState<
    boolean | null
  >(null);
  const [checkingServer, setCheckingServer] = useState<boolean>(false);

  const listServerSelectRef = useRef<BottomSheetModal>(null);

  // Default server to display for the "auto" option: the `default` entry for
  // the active chain, falling back to the first server.
  const autoDefaultForChain = (chainName: ServerUrisType['chainName']) =>
    serverUris(translate).find(
      (s: ServerUrisType) => s.chainName === chainName && s.default,
    ) ?? serverUris(translate)[0];

  // Reset the auto & list labels to the active server so switching modes never
  // leaves a stale, previously-picked server showing.
  const syncSelectableServersToActive = () => {
    setAutoServerUri(activeServer.uri);
    setAutoServerChainName(activeServer.chainName);
    setListServerUri(activeServer.uri);
    setListServerChainName(activeServer.chainName);
  };

  const setServer = () => {
    if (activeSelectServer === SelectServerEnum.auto) {
      setAutoIcon(faDotCircle);
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setAutoServerUri(activeServer.uri);
      setAutoServerChainName(activeServer.chainName);
    } else if (activeSelectServer === SelectServerEnum.list) {
      setAutoIcon(farCircle);
      setListIcon(faDotCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setListServerUri(activeServer.uri);
      setListServerChainName(activeServer.chainName);
      setAutoServerUri(activeServer.uri);
      setAutoServerChainName(activeServer.chainName);
    } else if (activeSelectServer === SelectServerEnum.custom) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(faDotCircle);
      setOfflineIcon(farCircle);
      setCustomServerUri(activeServer.uri);
      setCustomServerChainName(activeServer.chainName);
      setAutoServerUri(autoDefaultForChain(activeServer.chainName).uri);
      setAutoServerChainName(
        autoDefaultForChain(activeServer.chainName).chainName,
      );
    } else if (activeSelectServer === SelectServerEnum.offline) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(faDotCircle);
      setAutoServerUri(autoDefaultForChain(activeServer.chainName).uri);
      setAutoServerChainName(
        autoDefaultForChain(activeServer.chainName).chainName,
      );
    }
  };

  useEffect(() => {
    setServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only the first time

  // Expose the effective selection to the host whenever it changes.
  useEffect(() => {
    let uri = '';
    let chainName: string = activeServer.chainName;
    if (selectServer === SelectServerEnum.auto) {
      uri = autoServerUri;
      chainName = autoServerChainName;
    } else if (selectServer === SelectServerEnum.list) {
      uri = listServerUri;
      chainName = listServerChainName;
    } else if (selectServer === SelectServerEnum.custom) {
      uri = customServerUri;
      chainName = customServerChainName;
    } else if (selectServer === SelectServerEnum.offline) {
      // Offline = no server → no chain. The real chain is derived from the
      // wallet when it opens offline.
      uri = '';
      chainName = ChainNameEnum.noneChainName;
    }
    onChange({ selectServer, uri, chainName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectServer,
    autoServerUri,
    autoServerChainName,
    listServerUri,
    listServerChainName,
    customServerUri,
    customServerChainName,
  ]);

  const updateSelectedInfo = async (
    uri: string,
    chainName: string,
  ): Promise<void> => {
    if (uri && info && uri === info.serverUri) {
      // the currently-connected server → keep the full context info (version).
      setCheckingServer(false);
      setSelectedInfo(info);
      setSelectedServerActive(true);
      return;
    }
    if (!uri) {
      setCheckingServer(false);
      setSelectedInfo(blankInfo('', 0, chainName));
      setSelectedServerActive(null);
      return;
    }
    setCheckingServer(true);
    // Probe the block height, capped by the app's standard 15s server timeout.
    const heightStr = await Promise.race([
      getLatestBlockServerInfo(uri),
      new Promise<string>(resolve =>
        setTimeout(() => resolve('Error: timeout'), 15 * 1000),
      ),
    ]);
    const working = /^\d+$/.test(heightStr);
    setCheckingServer(false);
    setSelectedServerActive(working);
    setSelectedInfo(blankInfo(uri, working ? Number(heightStr) : 0, chainName));
  };

  // Custom server: validate the typed URI exactly like Save (bad URI / plaintext
  // http rejected via parseServerURI), then probe it. Empty input → neutral.
  const checkCustomServer = (): void => {
    if (!customServerUri) {
      setCheckingServer(false);
      setSelectedInfo(blankInfo('', 0, customServerChainName));
      setSelectedServerActive(null);
      return;
    }
    const parsed = parseServerURI(customServerUri, translate);
    if (parsed.toLowerCase().startsWith(GlobalConst.error)) {
      setCheckingServer(false);
      setSelectedInfo(blankInfo(customServerUri, 0, customServerChainName));
      setSelectedServerActive(false);
      return;
    }
    updateSelectedInfo(parsed, customServerChainName);
  };

  // Debounced custom-server check — same mechanism as the Swap amount → quote.
  useEffect(() => {
    if (selectServer !== SelectServerEnum.custom) {
      return;
    }
    const timer = setTimeout(() => {
      checkCustomServer();
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customServerUri, customServerChainName]);

  // Server List picker source: the live registry (hosh) for the active chain,
  // falling back to the static `serverUris` list when it is unreachable.
  const loadServerList = useCallback(async () => {
    const toItems = (list: ServerUrisType[]) =>
      list.map((item: ServerUrisType) => ({
        label: (item.region ? item.region + ' ' : '') + item.uri,
        value: item.uri,
      }));
    const staticItems = serverUris(translate).filter(
      (s: ServerUrisType) =>
        !s.obsolete && s.chainName === activeServer.chainName,
    );
    setItemsPicker(toItems(staticItems));
    const live = await fetchServerList(activeServer.chainName);
    if (live.length > 0) {
      setItemsPicker(toItems(live));
    }
  }, [translate, activeServer.chainName]);

  useEffect(() => {
    loadServerList();
  }, [loadServerList]);

  return (
    <>
      {/* Offline has no server, so the info header (URL/network/block/version)
          would be meaningless — hide it. */}
      {selectServer !== SelectServerEnum.offline && (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 10,
            backgroundColor: '#031124',
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 16,
          }}
        >
          {[
            ...(selectedInfo.version
              ? [
                  {
                    label: translate('info.serverversion') as string,
                    value: selectedInfo.version,
                  },
                ]
              : []),
            {
              label: translate('info.zainod') as string,
              value: selectedInfo.serverUri ? selectedInfo.serverUri : '-',
            },
            {
              label: translate('info.network') as string,
              value: !selectedInfo.chainName
                ? '-'
                : selectedInfo.chainName === ChainNameEnum.mainChainName
                  ? 'Mainnet'
                  : selectedInfo.chainName === ChainNameEnum.testChainName
                    ? 'Testnet'
                    : selectedInfo.chainName === ChainNameEnum.regtestChainName
                      ? 'Regtest'
                      : (translate('info.unknown') as string) +
                        ' (' +
                        selectedInfo.chainName +
                        ')',
            },
            {
              label: translate('info.serverblock') as string,
              value: selectedInfo.latestBlock
                ? selectedInfo.latestBlock.toString()
                : '-',
            },
          ].map(row => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 6,
                gap: 12,
              }}
            >
              <FadeText>{row.label}</FadeText>
              <RegText
                numberOfLines={1}
                ellipsizeMode="middle"
                style={{ flexShrink: 1, textAlign: 'right' }}
              >
                {row.value}
              </RegText>
            </View>
          ))}
        </View>
      )}

      <View>
        <TouchableOpacity
          testID="settings.offline-server"
          disabled={disabled}
          style={{
            marginRight: 10,
            marginBottom: 0,
            maxHeight: 50,
            minHeight: 48,
          }}
          onPress={() => {
            setOfflineIcon(faDotCircle);
            setAutoIcon(farCircle);
            setListIcon(farCircle);
            setCustomIcon(farCircle);
            setSelectServer(SelectServerEnum.offline);
            syncSelectableServersToActive();
            updateSelectedInfo('', activeServer.chainName);
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            {offlineIcon && (
              <FontAwesomeIcon
                icon={offlineIcon}
                size={16}
                color={colors.border}
              />
            )}
            <RegText style={{ marginLeft: 10 }}>
              {translate('settings.server-offline') as string}
            </RegText>
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ display: 'flex' }}>
        <FadeText>
          {translate('settings.server-offline-text') as string}
        </FadeText>
      </View>

      <View>
        <TouchableOpacity
          testID="settings.auto-server"
          disabled={disabled}
          style={{
            marginRight: 10,
            marginBottom: 0,
            maxHeight: 50,
            minHeight: 48,
          }}
          onPress={() => {
            setOfflineIcon(farCircle);
            setAutoIcon(faDotCircle);
            setListIcon(farCircle);
            setCustomIcon(farCircle);
            setSelectServer(SelectServerEnum.auto);
            // Auto = the best available server. Normally that's the active one,
            // but coming from Offline there is none (empty uri) → pick the first
            // (best) of the loaded list, falling back to the chain default, and
            // fill the header with it.
            const chain = activeServer.chainName;
            const best =
              activeServer.uri ||
              (itemsPicker.length > 0
                ? itemsPicker[0].value
                : autoDefaultForChain(chain).uri);
            setAutoServerUri(best);
            setAutoServerChainName(chain);
            setListServerUri(best);
            setListServerChainName(chain);
            updateSelectedInfo(best, chain);
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            {autoIcon && (
              <FontAwesomeIcon
                icon={autoIcon}
                size={16}
                color={colors.border}
              />
            )}
            <RegText style={{ marginLeft: 10 }}>
              {translate('settings.server-auto') as string}
            </RegText>
            {autoIcon === faDotCircle && (
              <FadeText
                style={{ marginLeft: 10, flexShrink: 1 }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {autoServerUri}
              </FadeText>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ display: 'flex' }}>
        <FadeText>{translate('settings.server-auto-text') as string}</FadeText>
      </View>

      <View>
        {!disabled && itemsPicker.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              loadServerList();
              listServerSelectRef.current?.present();
            }}
          >
            <View
              style={{
                marginRight: 10,
                marginBottom: 5,
                maxHeight: 50,
                minHeight: 48,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {listIcon && (
                <FontAwesomeIcon
                  icon={listIcon}
                  size={16}
                  color={colors.border}
                />
              )}
              <RegText testID="settings.list-server" style={{ marginLeft: 10 }}>
                {translate('settings.server-list') as string}
              </RegText>
              {listIcon === faDotCircle && (
                <FadeText
                  style={{ marginLeft: 10, flexShrink: 1 }}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {listServerUri}
                </FadeText>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View
            style={{
              marginRight: 10,
              marginBottom: 5,
              maxHeight: 50,
              minHeight: 48,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {listIcon && (
              <FontAwesomeIcon
                icon={listIcon}
                size={16}
                color={colors.border}
              />
            )}
            <RegText style={{ marginLeft: 10 }}>
              {translate('settings.server-list') as string}
            </RegText>
            {listIcon === faDotCircle && (
              <FadeText style={{ marginLeft: 10 }}>{listServerUri}</FadeText>
            )}
          </View>
        )}
      </View>
      <View style={{ display: 'flex' }}>
        <FadeText>{translate('settings.server-list-text') as string}</FadeText>
      </View>

      <View>
        <TouchableOpacity
          testID="settings.custom-server"
          disabled={disabled}
          style={{
            marginRight: 10,
            marginBottom: 5,
            maxHeight: 50,
            minHeight: 48,
          }}
          onPress={() => {
            setAutoIcon(farCircle);
            setListIcon(farCircle);
            setCustomIcon(faDotCircle);
            setSelectServer(SelectServerEnum.custom);
            syncSelectableServersToActive();
            checkCustomServer();
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            {customIcon && (
              <FontAwesomeIcon
                icon={customIcon}
                size={16}
                color={colors.border}
              />
            )}
            <RegText style={{ marginLeft: 10 }}>
              {translate('settings.server-custom') as string}
            </RegText>
          </View>
        </TouchableOpacity>
        {customIcon === farCircle && (
          <View style={{ display: 'flex' }}>
            <FadeText>
              {translate('settings.server-custom-text') as string}
            </FadeText>
          </View>
        )}

        {customIcon === faDotCircle && (
          <View>
            {(checkingServer || selectedServerActive !== null) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: checkingServer ? 'center' : 'flex-end',
                  gap: 6,
                  marginLeft: 5,
                  width: '90%',
                  marginTop: -10,
                  marginBottom: 15,
                }}
              >
                {checkingServer ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <FadeText style={{ fontSize: 12 }}>
                      {translate('settings.server-checking') as string}
                    </FadeText>
                  </>
                ) : (
                  <FontAwesomeIcon
                    icon={selectedServerActive ? faCheck : faXmark}
                    size={14}
                    color={
                      selectedServerActive ? colors.primary : colors.danger.text
                    }
                  />
                )}
              </View>
            )}
            <View
              accessible={true}
              accessibilityLabel={translate('settings.server-acc') as string}
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                marginLeft: 5,
                marginTop: -10,
                width: 'auto',
                maxWidth: '90%',
                minWidth: '50%',
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                testID="settings.custom-server-field"
                placeholder={GlobalConst.serverPlaceHolder}
                placeholderTextColor={colors.placeholder}
                style={{
                  color:
                    !checkingServer && selectedServerActive === false
                      ? colors.danger.text
                      : colors.text,
                  fontWeight: '600',
                  fontSize: 18,
                  flex: 1,
                  minHeight: 48,
                  marginLeft: 5,
                  backgroundColor: 'transparent',
                }}
                value={customServerUri}
                onChangeText={(text: string) => setCustomServerUri(text)}
                editable={!disabled}
                maxLength={100}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="URL"
              />
              {customServerUri && !disabled && (
                <TouchableOpacity onPress={() => setCustomServerUri('')}>
                  <FontAwesomeIcon
                    style={{ marginRight: 10 }}
                    size={20}
                    icon={faXmark}
                    color={colors.primaryDisabled}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View
              accessible={true}
              accessibilityLabel={translate('settings.server-acc') as string}
              style={{
                marginLeft: 5,
                width: 'auto',
                maxWidth: '90%',
                minWidth: '50%',
                minHeight: 48,
              }}
            >
              <View
                style={{
                  paddingTop: 10,
                  paddingLeft: 10,
                  paddingRight: 10,
                  marginBottom: 5,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ChainTypeToggle
                  customServerChainName={customServerChainName}
                  onPress={(chain: ChainNameEnum) =>
                    setCustomServerChainName(chain)
                  }
                  translate={translate}
                  disabled={disabled}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      <SelectBottomSheet
        ref={listServerSelectRef}
        title={translate('settings.select-placeholder') as string}
        items={itemsPicker}
        value={listServerUri ?? ''}
        onChange={itemValue => {
          if (itemValue) {
            setOfflineIcon(farCircle);
            setAutoIcon(farCircle);
            setListIcon(faDotCircle);
            setCustomIcon(farCircle);
            setSelectServer(SelectServerEnum.list);
            setListServerUri(itemValue);
            setAutoServerUri(itemValue);
            // Every item is for the active chain (fetched/filtered by it).
            setListServerChainName(activeServer.chainName);
            updateSelectedInfo(itemValue, activeServer.chainName);
          }
        }}
      />
    </>
  );
};

export default ServerSelector;
