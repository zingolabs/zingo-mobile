export default class SettingsFileClass {
  server: string;
  language: string;
  currency?: string;

  constructor(server: string, language: string) {
    this.server = server;
    this.language = language;
  }
}
