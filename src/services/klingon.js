const { Cluster } = require('puppeteer-cluster');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * runPuppeteer access the urls, returning the networking requests
 * @param {Array<String>} urls
 * @param {Object} [auth]
 * @param {String} auth.username
 * @param {String} auth.password
 * @return {Array<String>} filtered requests
 */
const runPuppeteer = async (urls, auth = null) => {

  const reqUrls = [];

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
  });

  cluster.on('taskerror', (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });

  await cluster.task(async ({ page, data: url }) => {

    url = new URL(url);

    await page.setRequestInterception(true);
    auth && await page.authenticate(auth);

    page.on('request', response => {

      let responseUrl = new URL(response.url());

      if (url.host == responseUrl.host &&
        !response.url().includes("browser-sync") &&
        response.url().charAt(response.url().length - 1) != '/') {

        let parse = path.parse(response.url());

        if (parse.ext == '.woff') {

          let { dir, name } = parse;

          let arrayFonts = [
            `${dir}/${name}.woff`,
            `${dir}/${name}.woff2`,
            `${dir}/${name}.svg`,
            `${dir}/${name}.ttf`,
            `${dir}/${name}.eot`,
          ]

          reqUrls.push(...arrayFonts);

        } else {
          reqUrls.push(response.url());
        }

      }
      response.continue();
    });
    await page.goto(url);
  });

  urls.map(async url => await cluster.queue(url))

  await cluster.idle();
  await cluster.close();

  // Filter repeated urls
  return Array.from(new Set(reqUrls))

}


/**
 * Create the folders according to the request path, then download the files following the url structure.
 * @param {String} url 
 * @param {String} time
 * @param {Object} [auth]
 * @param {String} auth.username
 * @param {String} auth.password
 */
const generateBuild = async (url, time, auth = null) => {
  
  try {

    url = new URL(url);

    pathname = path.parse(url.pathname).dir.replace(/^\.*\/|\/?[^\/]+\.[a-z]|\/$/g, '');

    await fs.mkdirSync(path.resolve(__dirname, '..', '..', 'temp', `build_${time}`, pathname), { recursive: true });

    let res = await axios(url.href, {
      auth,
      responseType: 'stream'
    });

    if (res.status == 200) {
      res.data.pipe(await fs.createWriteStream(path.resolve(__dirname, '..', '..', 'temp', `build_${time}`, url.pathname.substring(1))));
    }

  } catch (error) {

    if(error.response.status === 404) {
      console.log(url.href);
      console.log(error.message);
    }  

    
  }
}

module.exports = {
  runPuppeteer,
  generateBuild
}


