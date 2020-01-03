const { runPuppeteer, generateBuild } = require('../services/klingon.js');
const { cleanFiles, getAuth, zipper } = require('../utils');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// const { auth, urls } = require('../test.js');

const build = async (req, res) => {

  try {

    const { urls } = req.body;
    const auth = getAuth(req);

    await axios(urls[0], { auth });

    const time = new Date().getTime();
    const pathBuild = path.resolve(__dirname, '..', '..', 'temp', `build_${time}`);

    await cleanFiles(time);

    const networkRequests = await runPuppeteer(urls, auth);

    let logger = await generateBuild(networkRequests, time, auth)

    // ordenate log
    logger = logger.sort((a, b) => { a.url > b.url ? -1 : a.url < b.url ? 1 : 0 });

    await zipper(time);

    res.json({
      download: `/files/build_${time}.zip`,
      log: logger
    })

    fs.rmdirSync(pathBuild, { recursive: true });
    console.log(`Directory Deleted: ${pathBuild}`);
    console.log('finishing...');

  } catch (error) {

    if (auth) {
      if(error.response.status === 401) {
        res.status(401).send('Credenciais Inválidas!');
        return;
      }
    }

    if (error) {
      res.send(error);
    }

  }

}

module.exports = build;