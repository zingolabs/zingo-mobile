export class SendProgress {
  sendInProgress: boolean;
  progress: number;
  total: number;
  etaSeconds: number | string;

  constructor() {
    this.sendInProgress = false;
    this.progress = 0;
    this.total = 0;
    this.etaSeconds = 0;
  }
}
