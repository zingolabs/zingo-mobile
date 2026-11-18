/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSharedValue } from 'react-native-reanimated';
import {
  ChainNameEnum,
  CurrencyNameEnum,
  Route,
  SelectServerEnum,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  space4,
  space8,
  space12,
  space16,
  space20,
  useTheme,
} from '@app/theme';
import { navigateWallet } from '@app/navigation/navigate';
import { registerWalletsListener } from '@app/services/showWallets';
import { readSavedBalances, SavedBalance } from '@app/services/savedBalance';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { SwapStore } from '@app/swap';
import { formatZecAmount } from '@app/utils/formatZecAmount';
import type { WalletEntry } from '@app/walletBackend';
import { updateWalletMeta } from '@app/walletBackend';
import { askGate } from '@app/services/gateController';
import { recoveryEntryFor } from '@app/services/recoveryWalletInfo';
import { DeleteWalletContext } from '@app/wallet/types';
import AppSheetModal, { SheetScrollView } from '@ui/primitives/AppSheetModal';
import Button from '@ui/primitives/Button';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { PlusIcon } from '@ui/primitives/Icons/PlusIcon';
import Avatar, { AvatarCategory } from '@ui/widgets/Avatar';
import DeleteWalletSheet from '@ui/widgets/DeleteWalletSheet';
import { MASK } from '@ui/widgets/PrivateAmount';
import RadioRow, { RadioList } from '@ui/widgets/RadioRow';
import { DeleteMark, EditMark, playMark } from '@ui/widgets/RowActionMarks';
import TitleBar from '@ui/widgets/TitleBar';
import DetailRows from '@screens/Swap/components/DetailRows';

/** A wallet's name, at most this long. */
const NAME_MAX = 24;
/** A row action's square, as Address Book's. */
const ACTION = 36;
/** The networks in the order the sheet lists them. */
const NETWORKS = [
  ChainNameEnum.mainChainName,
  ChainNameEnum.testChainName,
  ChainNameEnum.regtestChainName,
];

const categoryOf = (wallet: WalletEntry): AvatarCategory =>
  (wallet.meta.category ?? 1) as AvatarCategory;

const metaViewOnly = (wallet: WalletEntry) => wallet.meta.kind === 'ufvk';

/** The wallets, one radio list per network; picking one opens it in place. */
export default function WalletsSheet() {
  const {
    translate,
    wallets,
    walletId,
    readOnly,
    seedBackedUp,
    privacy,
    switchWallet,
    deleteWallet,
    refreshWallets,
    restoreInPlace,
  } = useContext(ContextAppLoaded);
  const t = useCallback((key: string) => translate(key) as string, [translate]);
  const { colors } = useTheme();
  const listRef = useRef<BottomSheetModal>(null);
  const settingsRef = useRef<BottomSheetModal>(null);
  const deleteRef = useRef<BottomSheetModal>(null);
  const brokenRef = useRef<BottomSheetModal>(null);
  const [broken, setBroken] = useState<{
    wallet: WalletEntry;
    saved: boolean;
  } | null>(null);
  const [balances, setBalances] = useState<Record<string, SavedBalance>>({});
  const [editing, setEditing] = useState<WalletEntry | null>(null);
  const [deleting, setDeleting] = useState<{
    wallet: WalletEntry;
    context: DeleteWalletContext;
  } | null>(null);

  useEffect(
    () =>
      registerWalletsListener(() => {
        refreshWallets();
        listRef.current?.present();
      }),
    [refreshWallets],
  );

  useEffect(() => {
    readSavedBalances(wallets.map(w => w.id))
      .then(setBalances)
      .catch(() => setBalances({}));
  }, [wallets]);

  const closeList = useCallback(() => listRef.current?.dismiss(), []);

  /** The open wallet's flags are live in the app; the others' are in their meta. */
  const isViewOnly = (wallet: WalletEntry) =>
    wallet.id === walletId ? readOnly : metaViewOnly(wallet);
  const isBackedUp = (wallet: WalletEntry) =>
    wallet.id === walletId ? seedBackedUp : !!wallet.meta.seedBackedUp;

  const typeOf = (wallet: WalletEntry): string =>
    wallet.meta.kind || wallet.id === walletId
      ? t(isViewOnly(wallet) ? 'wallets.type-key' : 'wallets.type-seed')
      : '';

  const subOf = (wallet: WalletEntry): string => {
    const saved = balances[wallet.id];
    const type = typeOf(wallet);
    if (!saved || saved.kind === 'none') {
      return type;
    }
    const unit =
      wallet.meta.chain === ChainNameEnum.mainChainName
        ? CurrencyNameEnum.ZEC
        : CurrencyNameEnum.TAZ;
    const sub = t('wallets.row-sub')
      .replace('{balance}', privacy ? MASK : formatZecAmount(saved.total))
      .replace('{unit}', unit)
      .replace('{type}', type);
    return type ? sub : sub.replace(/ · $/, '');
  };

  const pick = (wallet: WalletEntry) => {
    closeList();
    if (wallet.id !== walletId) {
      switchWallet(wallet);
    }
  };

  /** A wallet that won't open leads to its own step instead of opening. */
  const openBroken = async (wallet: WalletEntry) => {
    const found = await recoveryEntryFor(wallet.id);
    setBroken({ wallet, saved: found.kind === 'entry' });
    brokenRef.current?.present();
  };

  const edit = (wallet: WalletEntry) => {
    setEditing(wallet);
    settingsRef.current?.present();
  };

  const askDelete = async (wallet: WalletEntry) => {
    const name = wallet.meta.name;
    const sub =
      wallets.length === 1
        ? t('wallets.delete-only')
        : t(
            isViewOnly(wallet)
              ? 'wallets.delete-sub-key'
              : 'wallets.delete-sub-seed',
          );
    const swapping = await SwapStore.inFlightFor(wallet.id).catch(() => false);
    setDeleting({
      wallet,
      context: {
        sub: sub.replace('{name}', name),
        warning: swapping
          ? t('wallets.delete-swap').replace('{name}', name)
          : '',
      },
    });
    deleteRef.current?.present();
  };

  const groups = NETWORKS.map(chain => ({
    chain,
    list: wallets.filter(
      w => (w.meta.chain || ChainNameEnum.mainChainName) === chain,
    ),
  })).filter(group => group.list.length > 0);

  return (
    <>
      <AppSheetModal
        ownScroll
        ref={listRef}
        header={
          <TitleBar
            title={t('wallets.title')}
            right={{
              icon: XIcon,
              accessibilityLabel: t('cancel'),
              onPress: closeList,
              testID: 'wallets.close',
            }}
          />
        }
      >
        <SheetScrollView
          testID="wallets.list"
          contentContainerStyle={{
            paddingTop: space8,
            paddingHorizontal: space20,
            rowGap: space12,
          }}
        >
          {groups.map(group => (
            <View key={group.chain} style={{ rowGap: space8 }}>
              {groups.length > 1 && (
                <Text
                  variant="bodySmall"
                  tone="muted"
                  style={{ fontWeight: '600', marginHorizontal: space4 }}
                >
                  {t(`settings.value-chainname-${group.chain}`)}
                </Text>
              )}
              <RadioList testID={`wallets.${group.chain}`}>
                {group.list.map((wallet, index) => (
                  <WalletRow
                    key={wallet.id}
                    wallet={wallet}
                    first={index === 0}
                    selected={wallet.id === walletId}
                    unavailable={!!wallet.meta.openFailed}
                    pill={
                      wallet.meta.openFailed
                        ? { text: t('wallets.cant-open'), tone: 'danger' }
                        : isViewOnly(wallet)
                          ? { text: t('wallets.view-only'), tone: 'viewOnly' }
                          : !isBackedUp(wallet) &&
                              (wallet.meta.kind || wallet.id === walletId)
                            ? {
                                text: t('wallets.not-backed-up'),
                                tone: 'warning',
                              }
                            : undefined
                    }
                    sub={subOf(wallet)}
                    editLabel={t('wallets.settings-acc').replace(
                      '{name}',
                      wallet.meta.name,
                    )}
                    deleteLabel={t('wallets.delete-acc').replace(
                      '{name}',
                      wallet.meta.name,
                    )}
                    editColor={colors.fgDefault}
                    deleteColor={colors.fgDanger}
                    onPress={() =>
                      wallet.meta.openFailed ? openBroken(wallet) : pick(wallet)
                    }
                    onEdit={() => edit(wallet)}
                    onDelete={() => askDelete(wallet)}
                  />
                ))}
              </RadioList>
            </View>
          ))}
          <Button
            testID="wallets.add"
            variant="text"
            icon={PlusIcon}
            title={t('wallets.add')}
            onPress={() => {
              closeList();
              navigateWallet({ screen: Route.AddWallet });
            }}
          />
        </SheetScrollView>
      </AppSheetModal>

      <WalletSettingsSheet
        ref={settingsRef}
        wallet={editing}
        viewOnly={!!editing && isViewOnly(editing)}
        onSaved={refreshWallets}
        onServer={() => {
          settingsRef.current?.dismiss();
          closeList();
          if (editing) {
            navigateWallet({
              screen: Route.Server,
              params: { walletId: editing.id },
            });
          }
        }}
      />

      <WontOpenSheet
        ref={brokenRef}
        wallet={broken?.wallet ?? null}
        saved={!!broken?.saved}
        onRetry={() => {
          if (broken) {
            brokenRef.current?.dismiss();
            closeList();
            switchWallet(broken.wallet);
          }
        }}
        onViewSeed={() => {
          if (broken) {
            brokenRef.current?.dismiss();
            closeList();
            navigateWallet({
              screen: Route.WalletSeed,
              params: { walletId: broken.wallet.id },
            });
          }
        }}
        onRestore={async () => {
          if (!broken) {
            return;
          }
          const answer = await askGate({ translate });
          if (answer.kind === 'declined') {
            return;
          }
          brokenRef.current?.dismiss();
          closeList();
          restoreInPlace(broken.wallet);
        }}
      />

      <DeleteWalletSheet
        ref={deleteRef}
        context={deleting?.context ?? { sub: '', warning: '' }}
        translate={translate}
        onConfirmed={() => {
          if (deleting) {
            closeList();
            deleteWallet(deleting.wallet);
          }
        }}
        onReleasedEarly={() => {}}
      />
    </>
  );
}

type WalletRowProps = {
  wallet: WalletEntry;
  first: boolean;
  selected: boolean;
  unavailable: boolean;
  pill: React.ComponentProps<typeof RadioRow>['pill'];
  sub: string;
  editLabel: string;
  deleteLabel: string;
  editColor: string;
  deleteColor: string;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** One wallet: its avatar, name and tag, the saved balance and type, and its two actions. */
function WalletRow({
  wallet,
  first,
  selected,
  unavailable,
  pill,
  sub,
  editLabel,
  deleteLabel,
  editColor,
  deleteColor,
  onPress,
  onEdit,
  onDelete,
}: WalletRowProps) {
  const pen = useSharedValue(0);
  const lid = useSharedValue(0);
  const action = (
    label: string,
    testID: string,
    onAction: () => void,
    mark: React.ReactNode,
    nudge: number,
  ) => (
    <Pressable
      kind="icon"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={space4}
      onPress={onAction}
      style={{
        width: ACTION,
        height: ACTION,
        marginLeft: nudge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mark}
    </Pressable>
  );
  return (
    <RadioRow
      testID={`wallets.row.${wallet.id}`}
      first={first}
      title={wallet.meta.name}
      pill={pill}
      sub={sub}
      selected={selected}
      unavailable={unavailable}
      onPress={onPress}
      leading={
        <Avatar
          kind="contact"
          name={wallet.meta.name}
          category={categoryOf(wallet)}
        />
      }
      trailing={
        <>
          {action(
            editLabel,
            `wallets.row.${wallet.id}.edit`,
            () => {
              pen.value = 0;
              playMark(pen, 'edit');
              onEdit();
            },
            <EditMark progress={pen} color={editColor} />,
            0,
          )}
          {action(
            deleteLabel,
            `wallets.row.${wallet.id}.delete`,
            () => {
              lid.value = 0;
              playMark(lid, 'delete');
              onDelete();
            },
            <DeleteMark progress={lid} color={deleteColor} />,
            -space4,
          )}
        </>
      }
    />
  );
}

type WalletSettingsSheetProps = {
  wallet: WalletEntry | null;
  viewOnly: boolean;
  onSaved: () => Promise<void>;
  onServer: () => void;
};

/** A wallet's settings: its name, and the network, origin and server it was made with. */
const WalletSettingsSheet = React.forwardRef<
  BottomSheetModal,
  WalletSettingsSheetProps
>(({ wallet, viewOnly, onSaved, onServer }, ref) => {
  const { translate } = useContext(ContextAppLoaded);
  const t = (key: string) => translate(key) as string;
  const [name, setName] = useState('');
  const [server, setServer] = useState('');

  useEffect(() => {
    if (!wallet) {
      return;
    }
    setName(wallet.meta.name);
    SettingsFileImpl.serverOf(wallet.meta).then(({ server: s, selectServer }) =>
      setServer(
        s.kind === 'offline'
          ? t('server.offline')
          : selectServer === SelectServerEnum.auto
            ? t('server.automatic')
            : s.uri.replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, ''),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const dismiss = () =>
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  const trimmed = name.trim();
  const changed = !!wallet && !!trimmed && trimmed !== wallet.meta.name;
  const chain = wallet?.meta.chain || ChainNameEnum.mainChainName;

  const save = async () => {
    if (!wallet || !changed) {
      return;
    }
    await updateWalletMeta(wallet.id, { name: trimmed });
    await onSaved();
    dismiss();
  };

  return (
    <AppSheetModal
      ownScroll
      ref={ref}
      header={
        <TitleBar
          title={t('wallets.settings')}
          left={{
            icon: ChevronLeft,
            accent: true,
            accessibilityLabel: t('wallets.title'),
            onPress: dismiss,
            testID: 'wallets.settings.back',
          }}
        />
      }
    >
      <SheetScrollView
        contentContainerStyle={{
          paddingTop: space8,
          paddingHorizontal: space20,
          rowGap: space12,
        }}
      >
        {!!wallet && (
          <>
            <View style={{ alignItems: 'center', paddingVertical: space4 }}>
              <Avatar
                kind="contact"
                size="lg"
                name={trimmed || wallet.meta.name}
                category={categoryOf(wallet)}
              />
            </View>
            <TextField
              testID="wallets.settings.name"
              label={t('wallets.name')}
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
            />
            <DetailRows
              rows={[
                {
                  label: t('wallets.network'),
                  value: t(`settings.value-chainname-${chain}`),
                },
                {
                  label: t('wallets.created-from'),
                  value: t(viewOnly ? 'wallets.type-key' : 'wallets.type-seed'),
                },
                {
                  label: t('wallets.server'),
                  value: server,
                  onPress: onServer,
                  testID: 'wallets.settings.server',
                },
              ]}
            />
            <Text
              variant="caption"
              tone="muted"
              style={{ marginHorizontal: space4 }}
            >
              {t('wallets.network-fixed')}
            </Text>
            <Button
              testID="wallets.settings.save"
              variant="primary"
              title={t('wallets.save')}
              disabled={!changed}
              onPress={save}
            />
          </>
        )}
      </SheetScrollView>
    </AppSheetModal>
  );
});

type WontOpenSheetProps = {
  wallet: WalletEntry | null;
  /** Its phrase is saved on the device, so it can be shown and restored. */
  saved: boolean;
  onRetry: () => void;
  onViewSeed: () => void;
  onRestore: () => void;
};

/** A wallet that won't open: try again, see its saved phrase, or restore it in its place. */
const WontOpenSheet = React.forwardRef<BottomSheetModal, WontOpenSheetProps>(
  ({ wallet, saved, onRetry, onViewSeed, onRestore }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const t = (key: string) => translate(key) as string;
    const dismiss = () =>
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    return (
      <AppSheetModal
        ownScroll
        ref={ref}
        header={
          <TitleBar
            title={t('wallets.wont-open-step')}
            left={{
              icon: ChevronLeft,
              accent: true,
              accessibilityLabel: t('wallets.title'),
              onPress: dismiss,
              testID: 'wallets.broken.back',
            }}
          />
        }
      >
        <SheetScrollView
          contentContainerStyle={{
            paddingTop: space8,
            paddingHorizontal: space20,
            rowGap: space12,
          }}
        >
          {!!wallet && (
            <>
              <View style={{ alignItems: 'center', paddingVertical: space4 }}>
                <Avatar
                  kind="contact"
                  size="lg"
                  name={wallet.meta.name}
                  category={categoryOf(wallet)}
                />
              </View>
              <Text
                variant="bodySmall"
                tone="muted"
                style={{ textAlign: 'center', marginHorizontal: space16 }}
              >
                {t('wallets.wont-open-step-body').replace(
                  '{name}',
                  wallet.meta.name,
                )}
              </Text>
              <View style={{ rowGap: space8 }}>
                <Button
                  testID="wallets.broken.retry"
                  variant="primary"
                  title={t('wallets.retry')}
                  onPress={onRetry}
                />
                {saved && (
                  <>
                    <Button
                      testID="wallets.broken.seed"
                      variant="text"
                      title={t('wallets.view-seed')}
                      onPress={onViewSeed}
                    />
                    <Button
                      testID="wallets.broken.restore"
                      variant="text"
                      title={t('wallets.restore-place')}
                      onPress={onRestore}
                    />
                  </>
                )}
              </View>
            </>
          )}
        </SheetScrollView>
      </AppSheetModal>
    );
  },
);
