export default class SettingsFileEntry {
  server?: string;
  language?: string;
  currency?: string;

  constructor(server: string) {
    this.server = server;
    this.language = '';
    this.currency = '';
  }
}
