const mMoment = {
  format: p => {
    if (p === 'MMM YYYY') {
      return 'Dec 2022';
    } else if (p === 'YYYY MMM D h:mm a') {
      return '2022 Dec 13 8:00 am';
    } else if (p === 'MMM D, h:mm a') {
      return 'Dec 13, 8:00 am';
    }
  },
};
const fn = () => {
  return mMoment;
};
fn.default = fn;
fn.locale = jest.fn();
export default fn;
