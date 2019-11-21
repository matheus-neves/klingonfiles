const fs = require('fs');
const path = require('path');

/**
 * Clears files that are longer than 2 hours
 * @param {String} time - Timestamp the folder was created
 */
const cleanFiles = async (time) => {

  fs.readdir(path.resolve(__dirname, '..', '..', 'temp'), (err, files) => {

    if (err) {
      console.log('Error on scan dir', err);
      return;
    }

    for (file of files) {
      let timestamp = Number(file.replace(/[^0-9]/g, ""));

      if (time > new Date(timestamp).setSeconds(60)) {
        fs.rmdir(path.resolve(__dirname, '..', '..', 'temp', file), { recursive: true }, () => {
          console.log(`File deleted: ${file}`);
        });
      } else {
        console.log(`File keeped: ${file}`);
      }
    }

  })
}

module.exports = {
  cleanFiles
}