import { act, renderHook } from '@testing-library/react-native';
import {
  AddressKindEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/AppState';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import { useReceiveSelection } from '@screens/Receive/useReceiveSelection';

const ua = (index: number, address: string) =>
  new UnifiedAddressClass(
    index,
    address,
    AddressKindEnum.u,
    true,
    false,
    false,
  );
const ta = (index: number, address: string) =>
  new TransparentAddressClass(
    index,
    address,
    AddressKindEnum.t,
    RPCAddressScopeEnum.external,
  );

const shielded = [ua(0, 'u-old'), ua(1, 'u-new')];
const transparent = [ta(0, 't-one')];

type Props = {
  s: UnifiedAddressClass[];
  t: TransparentAddressClass[];
  pin: string;
  loaded: boolean;
};

const selection = (initial: Props) =>
  renderHook(
    ({ s, t, pin, loaded }: Props) => useReceiveSelection(s, t, pin, loaded),
    { initialProps: initial },
  );

describe('Receive selection', () => {
  test('Tests that Receive opens on the newest shielded address when nothing is pinned', () => {
    const { result } = selection({
      s: shielded,
      t: transparent,
      pin: '',
      loaded: true,
    });
    expect(result.current[0]).toBe('u-new');
  });

  test('Tests that Receive opens on the pinned address when one is pinned', () => {
    const { result } = selection({
      s: shielded,
      t: transparent,
      pin: 't-one',
      loaded: true,
    });
    expect(result.current[0]).toBe('t-one');
  });

  test('Tests that nothing is picked until the pin is read when it is still loading', () => {
    const { result, rerender } = selection({
      s: shielded,
      t: transparent,
      pin: '',
      loaded: false,
    });
    expect(result.current[0]).toBe('');
    rerender({ s: shielded, t: transparent, pin: 'u-old', loaded: true });
    expect(result.current[0]).toBe('u-old');
  });

  test('Tests that a new address becomes the current one when it turns up, even with a pin', () => {
    const { result, rerender } = selection({
      s: shielded,
      t: transparent,
      pin: 'u-old',
      loaded: true,
    });
    rerender({
      s: shielded,
      t: [...transparent, ta(1, 't-two')],
      pin: 'u-old',
      loaded: true,
    });
    expect(result.current[0]).toBe('t-two');
  });

  test('Tests that a pick from Your addresses stays when the pin changes', () => {
    const { result, rerender } = selection({
      s: shielded,
      t: transparent,
      pin: '',
      loaded: true,
    });
    act(() => result.current[1]('u-old'));
    rerender({ s: shielded, t: transparent, pin: 'u-old', loaded: true });
    expect(result.current[0]).toBe('u-old');
  });
});
