const fs = require('fs');
const path = require('path');
// eslint-disable-next-line @react-native/no-deep-imports
const reactNativeResolver = require('react-native/jest/resolver');

// Metro picks `name@3x.png` for `require('name.png')`; jest's resolver does
// not, so fall back to the scaled file when the unscaled one is absent.
module.exports = (request, options) => {
  try {
    return reactNativeResolver(request, options);
  } catch (e) {
    const m = request.match(/^(.*)\.(png|jpg|jpeg|gif|webp)$/);
    if (m) {
      for (const scale of ['@3x', '@2x']) {
        const scaled = path.resolve(options.basedir, `${m[1]}${scale}.${m[2]}`);
        if (fs.existsSync(scaled)) {
          return scaled;
        }
      }
    }
    throw e;
  }
};
