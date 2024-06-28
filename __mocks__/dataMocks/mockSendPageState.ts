import { SendPageStateClass, ToAddrClass } from '../../app/AppState';
import Utils from '../../app/utils';

const mockSendPageState: SendPageStateClass = new SendPageStateClass(new ToAddrClass(Utils.getNextToAddrID()));

mockSendPageState.toaddr.id = 1234567890;
mockSendPageState.toaddr.to = 'UA-12345678901234567890';
mockSendPageState.toaddr.amount = '1.12345678';
mockSendPageState.toaddr.amountCurrency = '50.22';
mockSendPageState.toaddr.memo = 'memo1\nmemo2\nmemo3\nmemo4\nmemo5\nmemo6\nmemo7\nmemo8\nmemo9\nmemo10';

export default mockSendPageState;
