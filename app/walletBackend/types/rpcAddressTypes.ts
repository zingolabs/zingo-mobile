import { ChainNameEnum } from '../../AppState';

export enum RPCAddressKindEnum {
  unifiedAddressKind = 'unified',
  saplingAddressKind = 'sapling',
  transparentAddressKind = 'transparent',
  ufvkAddressKind = 'ufvk',
  texAddressKind = 'tex',
}

export enum RPCAddressScopeEnum {
  external = 'external',
  internal = 'internal',
  refund = 'refund',
}

export enum RPCCheckAddressTypeEnum {
  unifiedAddressType = 'unified',
  orchardInternalAddressType = 'orchard_internal',
  saplingAddressType = 'sapling',
  transparentAddressType = 'transparent',
}

export enum RPCParseAddressStatusEnum {
  successAddressParse = 'success',
  invalidAddressParse = 'Invalid address',
}

export enum RPCParseViewKeyStatusEnum {
  successViewKeyParse = 'success',
  invalidViewKeyParse = 'Invalid viewkey',
}

export enum RPCPoolsEnum {
  orchardRPCPool = 'orchard',
  saplingRPCPool = 'sapling',
  transparentRPCPool = 'transparent',
}

export enum RPCReceiversEnum {
  orchardRPCReceiver = 'orchard',
  saplingRPCReceiver = 'sapling',
  transparentRPCReceiver = 'transparent',
}

export type RPCUnifiedAddressType = {
  account: number;
  address_index: number;
  has_orchard: boolean;
  has_sapling: boolean;
  has_transparent: boolean;
  encoded_address: string;
};

export type RPCTransparentAddressType = {
  account: number;
  address_index: number;
  scope: RPCAddressScopeEnum;
  encoded_address: string;
};

export type RPCParseAddressType = {
  status: RPCParseAddressStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | RPCAddressKindEnum.unifiedAddressKind
    | RPCAddressKindEnum.saplingAddressKind
    | RPCAddressKindEnum.transparentAddressKind
    | RPCAddressKindEnum.texAddressKind;
  receivers_available?: RPCReceiversEnum[];
  only_orchard_ua?: string;
};

export type RPCParseViewKeyType = {
  status: RPCParseViewKeyStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?: RPCAddressKindEnum.ufvkAddressKind;
  pools_available?: RPCPoolsEnum[];
};

export type RPCCheckAddressType = {
  is_wallet_address: boolean;
  account_id: number;
  address_type: RPCCheckAddressTypeEnum;
  encoded_address: string;
  address_index?: number;
  has_orchard?: boolean;
  has_sapling?: boolean;
  has_transparent?: boolean;
  diversifier_index?: number;
  scope?: RPCAddressScopeEnum;
};
