import ToAddr from './ToAddrClass';

export default class SendPageStateClass {
  toaddr: ToAddr;

  constructor(toaddr: ToAddr) {
    this.toaddr = toaddr;
  }
}
