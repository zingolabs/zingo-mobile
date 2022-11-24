export class PasswordState {
  showPassword: boolean;

  confirmNeeded: boolean;

  passwordCallback: ((password: string) => void) | null;

  closeCallback: (() => void) | null;

  helpText: string | null;

  constructor() {
    this.showPassword = false;
    this.confirmNeeded = false;
    this.passwordCallback = null;
    this.closeCallback = null;
    this.helpText = null;
  }
}
