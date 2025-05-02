export enum CommandEnum {
  walletKind = 'wallet_kind',
  updatecurrentprice = 'updatecurrentprice',
  setoption = 'setoption',
  getoption = 'getoption',
  version = 'version',
  export = 'export',
  new = 'new',
  import = 'import',
  addresses = 'addresses',
  parseAddress = 'parse_address',
  parseViewkey = 'parse_viewkey',
  balance = 'balance',
  valueToAddress = 'value_to_address',
  sendsToAddress = 'sends_to_address',
  memobytesToAddress = 'memobytes_to_address',

  // calculate the max spendable amount in the wallet
  spendablebalance = 'spendablebalance',
  // new commands to create a proposal
  send = 'send',
  sendall = 'sendall',
  shield = 'shield',
  // this works for all: send, sendall & shield
  confirm = 'confirm',
  messages = 'messages',
}
