const path = require('path');

function resolveUploadDirectory() {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }

  return path.resolve(__dirname, '../../uploads');
}

module.exports = {
  resolveUploadDirectory
};
