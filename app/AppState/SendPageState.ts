import { ToAddr } from './ToAddr';

export class SendPageState {
  toaddr: ToAddr;

  constructor(toaddr: ToAddr) {
    this.toaddr = toaddr;
  }
}
