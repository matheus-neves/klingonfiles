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
    puppeteerOptions: {
      headless: true,
      args: ['--no-sandbox']
    },
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
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
            `${dir}/${name}.woff2#force`,
            `${dir}/${name}.svg#force`,
            `${dir}/${name}.ttf#force`,
            `${dir}/${name}.eot#force`,
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
 * @returns {Promise} Returns a Promise writeStream
 */
const generateBuild = async (networkRequests, time, auth = null) => {

  console.log('init generateBuild');

  let writer = '';
  let forcedLog = [];
  let logger = [];

  const pathBuild = path.resolve(__dirname, '..', '..', 'temp', `build_${time}`);

  for (let url of networkRequests) {

    url = new URL(url);

    pathname = path.parse(url.pathname).dir.replace(/^\.*\/|\/?[^\/]+\.[a-z]|\/$/g, '');

    await fs.mkdirSync(path.resolve(pathBuild, pathname), { recursive: true });

    let res = await axios(url.href, {
      auth,
      responseType: 'stream',
      validateStatus: (status) => {

        let href = url.href;

        if (status === 200 && url.hash === '#force') {

          forcedLog.push({
            status,
            url: href.replace('#force', '')
          });
        }

        if (url.hash !== '#force') {
          logger.push({ status, url: url.href })
        }

        return status < 500; // Reject only if the status code is greater than or equal to 500
      }
    });

    if (res.status == 200) {

      writer = await fs.createWriteStream(path.resolve(pathBuild, url.pathname.substring(1)));
      res.data.pipe(writer);
    }

  }

  logger = [...logger, ...forcedLog];

  return new Promise((resolve, reject) => {
    writer.on('finish', () => writer.close(resolve(logger)))
    writer.on('error', error => {
      reject(error)
    })
  });

}

module.exports = {
  runPuppeteer,
  generateBuild
}
