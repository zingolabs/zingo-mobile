import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { GlobalConst } from '@app/AppState';
import { createAlert } from '@app/services/createAlert';
import { showConfirm } from '@app/services/showConfirm';

jest.mock('@app/services/showConfirm', () => ({ showConfirm: jest.fn() }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));

const translate = (key: string) => key;

beforeEach(() => {
  jest.clearAllMocks();
});

test('Tests that createAlert stashes the error for the next foreground when the stored background flag says yes.', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(GlobalConst.yes);
  const setBackgroundError = jest.fn();
  const addLastSnackbar = jest.fn();

  await createAlert(
    setBackgroundError,
    addLastSnackbar,
    'Sync',
    'the server went away',
    false,
    translate,
  );

  expect(AsyncStorage.getItem).toHaveBeenCalledWith(GlobalConst.background);
  expect(setBackgroundError).toHaveBeenCalledWith(
    'Sync',
    'the server went away',
  );
  expect(showConfirm).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('Tests that createAlert shows the confirm dialog when the stored background flag says no and no mail sender is given.', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(GlobalConst.no);
  const setBackgroundError = jest.fn();
  const addLastSnackbar = jest.fn();

  await createAlert(
    setBackgroundError,
    addLastSnackbar,
    'Sync',
    'the server went away',
    false,
    translate,
  );

  expect(setBackgroundError).not.toHaveBeenCalled();
  expect(showConfirm).toHaveBeenCalledWith({
    title: 'Sync',
    message: 'the server went away',
    buttons: [{ text: 'close' }],
  });
});
