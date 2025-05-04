export enum CommandEnum {
  // commands to migrate when they are stable
  setoption = 'setoption',
  getoption = 'getoption',

  // new commands to create a proposal
  send = 'send',
  sendall = 'sendall',
  shield = 'shield',
  // this works for all: send, sendall & shield
  confirm = 'confirm',
}
