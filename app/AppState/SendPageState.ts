import ToAddr from './ToAddr';

export default class SendPageState {
  toaddr: ToAddr;

  constructor(toaddr: ToAddr) {
    this.toaddr = toaddr;
  }
}
