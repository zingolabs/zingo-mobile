import { Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { GlobalConst, TranslateType } from '@app/AppState';
import { redactReport } from '@app/utils/redactReport';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import { showConfirm } from './showConfirm';
import { privateHosts, reportDiagnostics } from './reportDiagnostics';

export const sendEmail = async (
  translate: (key: string) => TranslateType,
  zingolibVersion: string,
  subject?: string,
  body?: string,
) => {
  const email: string = translate('email') as string;
  // Everything the mail carries is redacted: user folders in paths (Hermes
  // embeds compile-time absolute paths into release stacks), keys,
  // addresses, hashes, IPs and a custom server.
  const hosts = privateHosts(translate);
  const subjectEmail: string = redactReport(
    subject || (translate('subject') as string),
    hosts,
  );
  const bodyEmail: string = redactReport(
    body || (translate('body') as string),
    hosts,
  );
  const diagnostics: string = redactReport(
    await reportDiagnostics(translate),
    hosts,
  );
  const appLabel: string = `${getZingoName()} ${getZingoVersion()}`;
  const zingolibVersionEmail: string = zingolibVersion;
  const systemName = DeviceInfo.getSystemName();
  const systemVersion = DeviceInfo.getSystemVersion();
  const manufacturer = await DeviceInfo.getManufacturer();
  const model = DeviceInfo.getModel();

  const url = `mailto:${email}?subject=${encodeURIComponent(subjectEmail)}&body=${encodeURIComponent(
    manufacturer +
      ' / ' +
      model +
      ' / ' +
      systemName +
      ' / ' +
      systemVersion +
      '\n' +
      appLabel +
      '\n' +
      (zingolibVersionEmail
        ? GlobalConst.zingolib + ': ' + zingolibVersionEmail
        : '') +
      '\n\n' +
      diagnostics +
      '\n\n' +
      bodyEmail,
  )}`;

  try {
    await Linking.openURL(url);
    console.log('Email client opened', url);
  } catch (err: unknown) {
    console.log(
      'Error opening email client:',
      err instanceof Error ? err.message : String(err),
    );
    showConfirm({
      title: translate('loadedapp.email-error-title') as string,
      message: translate('loadedapp.email-error-body') as string,
      buttons: [{ text: translate('close') as string }],
    });
  }
};
