/* eslint-disable react-native/no-inline-styles */
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@app/theme';

import { BiohazardIcon } from './BiohazardIcon';
import { CheckIcon } from './CheckIcon';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from './Chevron';
import { CopyIcon } from './CopyIcon';
import { EyeIcon } from './EyeIcon';
import { EyeOffIcon } from './EyeOffIcon';
import { FiltersIcon } from './FiltersIcon';
import { HouseFilledIcon } from './HouseFilledIcon';
import { HouseOutlineIcon } from './HouseOutlineIcon';
import { KeyIcon } from './KeyIcon';
import { ListIcon } from './ListIcon';
import { MessagesIcon } from './MessagesIcon';
import { PencilIcon } from './PencilIcon';
import { ReceiveFilledIcon } from './ReceiveFilledIcon';
import { ReceiveIcon } from './ReceiveIcon';
import { SendFilledIcon } from './SendFilledIcon';
import { SendOutlineIcon } from './SendOutlineIcon';
import { ShieldCheckIcon } from './ShieldCheckIcon';
import { ShieldIcon } from './ShieldIcon';
import { SkullIcon } from './SkullIcon';
import { SproutIcon } from './SproutIcon';
import { TriangleAlert } from './TriangleAlert';
import { VerifyCheckIcon } from './VerifyCheckIcon';
import { VerifyXIcon } from './VerifyXIcon';
import { XIcon } from './XIcon';
import { ArrowDownIcon } from './ArrowDownIcon';
import { ArrowRightIcon } from './ArrowRightIcon';
import { ArrowUpIcon } from './ArrowUpIcon';
import { CheckCircleLineIcon } from './CheckCircleLineIcon';
import { CloudDownloadIcon } from './CloudDownloadIcon';
import { ContactIcon } from './ContactIcon';
import { DatabaseIcon } from './DatabaseIcon';
import { FileTextIcon } from './FileTextIcon';
import { HistoryIcon } from './HistoryIcon';
import { InfoIcon } from './InfoIcon';
import { KeyboardIcon } from './KeyboardIcon';
import { LockIcon } from './LockIcon';
import { LockOpenIcon } from './LockOpenIcon';
import { PlayIcon } from './PlayIcon';
import { PlusIcon } from './PlusIcon';
import { QrCodeIcon } from './QrCodeIcon';
import { RadioOffIcon } from './RadioOffIcon';
import { RadioOnIcon } from './RadioOnIcon';
import { RefreshIcon } from './RefreshIcon';
import { SwapIcon } from './SwapIcon';
import { TagsIcon } from './TagsIcon';
import { WifiIcon } from './WifiIcon';
import { ZoomInIcon } from './ZoomInIcon';

const icons = {
  Biohazard: BiohazardIcon,
  Check: CheckIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy: CopyIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  Filters: FiltersIcon,
  HouseFilled: HouseFilledIcon,
  HouseOutline: HouseOutlineIcon,
  Key: KeyIcon,
  List: ListIcon,
  Messages: MessagesIcon,
  Pencil: PencilIcon,
  ReceiveFilled: ReceiveFilledIcon,
  Receive: ReceiveIcon,
  SendFilled: SendFilledIcon,
  SendOutline: SendOutlineIcon,
  Shield: ShieldIcon,
  ShieldCheck: ShieldCheckIcon,
  Skull: SkullIcon,
  Sprout: SproutIcon,
  TriangleAlert,
  VerifyCheck: VerifyCheckIcon,
  VerifyX: VerifyXIcon,
  X: XIcon,
  ArrowDown: ArrowDownIcon,
  ArrowRight: ArrowRightIcon,
  ArrowUp: ArrowUpIcon,
  CheckCircleLine: CheckCircleLineIcon,
  CloudDownload: CloudDownloadIcon,
  Contact: ContactIcon,
  Database: DatabaseIcon,
  FileText: FileTextIcon,
  History: HistoryIcon,
  Info: InfoIcon,
  Keyboard: KeyboardIcon,
  Lock: LockIcon,
  LockOpen: LockOpenIcon,
  Play: PlayIcon,
  Plus: PlusIcon,
  QrCode: QrCodeIcon,
  RadioOff: RadioOffIcon,
  RadioOn: RadioOnIcon,
  Refresh: RefreshIcon,
  Swap: SwapIcon,
  Tags: TagsIcon,
  Wifi: WifiIcon,
  ZoomIn: ZoomInIcon,
};

const Gallery: React.FunctionComponent<{ size: number }> = ({ size }) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        alignItems: 'flex-start',
      }}
    >
      {Object.entries(icons).map(([name, IconCmp]) => (
        <View key={name} style={{ alignItems: 'center', width: 84, gap: 6 }}>
          <IconCmp size={size} color={colors.fgDefault} />
          <Text style={{ color: colors.fgMuted, fontSize: 11 }}>{name}</Text>
        </View>
      ))}
    </View>
  );
};

const meta: Meta<typeof Gallery> = {
  title: 'Icons/Gallery',
  component: Gallery,
  args: { size: 24 },
};

export default meta;
type Story = StoryObj<typeof Gallery>;

/** The three sizes. The stroke reads the same at each one. */
export const All: Story = {};
export const Medium: Story = { args: { size: 20 } };
export const Small: Story = { args: { size: 16 } };
