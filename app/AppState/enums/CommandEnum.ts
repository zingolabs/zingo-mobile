export enum CommandEnum {
  // commands to migrate when they are stable
  updatecurrentprice = 'updatecurrentprice',
  setoption = 'setoption',
  getoption = 'getoption',

  // calculate the max spendable amount in the wallet
  spendablebalance = 'spendablebalance',

  // new commands to create a proposal
  send = 'send',
  sendall = 'sendall',
  shield = 'shield',
  // this works for all: send, sendall & shield
  confirm = 'confirm',
}
