export type AddressType = {
  address: string;
  receivers: {
    orchard_exists: boolean;
    sapling: string | null;
    transparent: string | null;
  };
};
