export enum CommandEnum {
  changeserver = 'changeserver',
  walletKind = 'wallet_kind',
  updatecurrentprice = 'updatecurrentprice',
  setoption = 'setoption',
  getoption = 'getoption',
  info = 'info',
  version = 'version',
  export = 'export',
  new = 'new',
  import = 'import',
  exportufvk = 'exportufvk',
  addresses = 'addresses',
  parseAddress = 'parse_address',
  parseViewkey = 'parse_viewkey',
  balance = 'balance',
  seed = 'seed',
  valueToAddress = 'value_to_address',
  sendsToAddress = 'sends_to_address',
  memobytesToAddress = 'memobytes_to_address',

  // calculate the max sendable amount in the wallet
  spendablebalance = 'spendablebalance',
  // new commands to create a proposal
  send = 'send',
  sendall = 'sendall',
  shield = 'shield',
  // this works for all: send, sendall & shield
  confirm = 'confirm',
  messages = 'messages',
}
