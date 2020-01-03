const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Clears files that are longer than 2 hours
 * @param {String} time - Timestamp the folder was created
 */
const cleanFiles = async time => {

  fs.readdir(path.resolve(__dirname, '..', '..', 'temp'), (err, files) => {

    if (err) {
      console.log('Error on scan dir', err);
      return;
    }

    for (file of files) {
      let timestamp = Number(file.replace(/[^0-9]/g, ""));
      if (time > new Date(timestamp).setSeconds(3600)) {
        fs.rmdirSync(path.resolve(__dirname, '..', '..', 'temp', file), { recursive: true });
        console.log(`File deleted: ${file}`);
      } else {
        console.log(`File keeped: ${file}`);
      }
    }

  })
}

/**
 * Format headers authorization
 * @param {Object} req - request from express
 * @returns {Object} username, password
 */
const getAuth = req => {

  const base64Credentials =  req.headers.authorization.split(' ')[1];

  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');

  const [username, password] = credentials.split(':');

  return auth = {
    username,
    password
  };

}

/**
 * @param {String} time - timestamp
 * @returns {Promise} resolve a Promise after close zip
 */
const zipper = async time => {

  console.log('ziping...', `build_${time}`);

  const archive = archiver.create('zip', {});
  const output = fs.createWriteStream(path.resolve(__dirname, '..', '..', 'temp', `build_${time}.zip`));

  archive.pipe(output);

  archive
    .directory(path.resolve(__dirname, '..', '..', 'temp', `build_${time}`), false)
    .finalize();

  return new Promise( (resolve, reject) => output.on('close', resolve));
  
}


module.exports = {
  cleanFiles,
  getAuth,
  zipper
}