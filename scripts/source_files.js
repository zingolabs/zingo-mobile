const fs = require('fs');
const path = require('path');

const filesUnder = (dir, pattern) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return filesUnder(file, pattern);
    }
    return pattern.test(entry.name) ? [file] : [];
  });

module.exports = { filesUnder };
