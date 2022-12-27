export default class SendProgressClass {
  sendInProgress: boolean;
  progress: number;
  total: number;
  etaSeconds: number | string;

  constructor(progress: number, total: number, etaSeconds: number | string) {
    this.sendInProgress = false;
    this.progress = progress;
    this.total = total;
    this.etaSeconds = etaSeconds;
  }
}
