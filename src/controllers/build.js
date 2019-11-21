const { runPuppeteer, generateBuild } = require('../services/klingon.js');
const { cleanFiles } = require('../utils');
const fs = require('fs');
const zl = require("zip-lib");
const path = require('path');
const axios = require('axios');
const {auth, urls} = require('../test.js');


const build = async (req, res) => {

  // let { urls } = req.body;

  
  



  // auth = null

  try {

    await axios(urls[0], { auth });

    const time = new Date().getTime();
    const pathBuild = path.resolve(__dirname, '..', '..', 'temp', `build_${time}`);

    await cleanFiles(time);

    const networkRequests = await runPuppeteer(urls, auth);
    console.log(`generating build_${time}`);

    for (url of networkRequests) {
      await generateBuild(url, time, auth)
    }

    const zipper = zl.archiveFolder(pathBuild, path.resolve(__dirname, '..', '..', 'temp', `build_${time}.zip`));

    zipper.then( () => {

      res.download(path.resolve(__dirname, '..', '..', 'temp', `build_${time}.zip`), err => {

        if (err) {
          console.log(`Error to download file: ${err}`);
          res.send(`Error to download file: ${err}`)
        } 

        fs.rmdirSync(pathBuild, { recursive: true }, null);
        console.log(`Directory Deleted: ${pathBuild}`);
        
      })
    }, err => {
      res.send(`Error on zip file: ${err}`);
    })


  } catch (error) {

    console.log('errouuuuu', error);

    if (error.response.status == 401) {
      res.send('Credenciais Inválidas!');
    }
  }


}


module.exports = build;

