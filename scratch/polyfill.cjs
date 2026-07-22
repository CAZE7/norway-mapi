const util = require('node:util');
if (!util.styleText) {
  util.styleText = (format, text) => text;
}
