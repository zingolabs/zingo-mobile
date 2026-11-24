import type { Meta, StoryObj } from '@storybook/react-native';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';
import SyncLine from './SyncLine';
import { INITIAL_SERVER_HEALTH_VIEW } from '@app/services/serverHealthMonitor';
import {
  mockTranslate,
  withNavigation,
} from '../../../../.storybook/storyDecorators';

/** A long host, the case that used to run off both sides of the screen. */
const zainod = remoteServer(
  'https://mainnet.indexer.long-hostname.example:443',
  ChainNameEnum.mainChainName,
);
const mobileData = {
  isConnected: true,
  type: NetInfoStateType.cellular,
  isConnectionExpensive: true,
};

const meta: Meta<typeof SyncLine> = {
  title: 'Header/SyncLine',
  component: SyncLine,
  decorators: [withNavigation],
  args: {
    translate: mockTranslate,
    server: zainod,
    netInfo: mobileData,
    percentage: 100,
    syncInProgress: false,
    opening: '',
    health: INITIAL_SERVER_HEALTH_VIEW,
    onDefaultBack: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SyncLine>;

/**
 * Every state on mobile data: the calm ones add "Mobile data", whole, and
 * their words give way; a warning (Offline, No internet; Behind too, which needs a real clock
 * and is covered by the unit test) shows alone.
 */
export const Connecting: Story = { args: { percentage: 0 } };
export const Syncing: Story = {
  args: { percentage: 42.7, syncInProgress: true },
};
export const Synced: Story = {};
export const Offline: Story = {
  args: { server: offlineServer(ChainNameEnum.mainChainName) },
};
export const NoInternet: Story = {
  args: {
    netInfo: {
      isConnected: false,
      type: NetInfoStateType.none,
      isConnectionExpensive: false,
    },
  },
};

/** The server states: only the dot takes a color, the words stay muted. */
export const ServerSlow: Story = {
  args: { health: { ...INITIAL_SERVER_HEALTH_VIEW, level: 'slow' } },
};
export const ServerDown: Story = {
  args: { health: { ...INITIAL_SERVER_HEALTH_VIEW, level: 'down' } },
};
export const DefaultBack: Story = {
  args: {
    health: {
      ...INITIAL_SERVER_HEALTH_VIEW,
      defaultBack: true,
      defaultUri: 'https://zec.global:443',
    },
  },
};

/** At 200% text the line still holds the screen: the words are cut sooner. */
export const ConnectingLargeText: Story = {
  args: { percentage: 0 },
  parameters: { textScale: 2 },
};
export const NoInternetLargeText: Story = {
  ...NoInternet,
  parameters: { textScale: 2 },
};
