const { Cluster } = require('puppeteer-cluster');
const path = require('path');
const fs = require('fs');
const request = require('request');

const urls = [];
const reqUrls = [];

runPuppeteer = async urls => {

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
  });

  await cluster.task(async ({ page, data: url }) => {

    url = new URL(url);
    await page.setRequestInterception(true);
    await page.authenticate({ username: '', password: '' })
    page.on('request', response => {
      let responseUrl = new URL(response.url());
      
      if (url.host == responseUrl.host &&
        !response.url().includes("browser-sync") &&
        response.url().charAt(response.url().length - 1) != '/') {
        reqUrls.push(response.url());
      }
      response.continue();
    });
    await page.goto(url);
  });

  urls.map(async url => {
    await cluster.queue(url);
  })

  await cluster.idle();
  await cluster.close();

}

generateBuild = async url => {

  

  url = new URL(url);

  

  pathname = url.pathname.replace(/^\.*\/|\/?[^\/]+\.[a-z]+|\/$/g, '');
  

  await fs.mkdirSync(path.resolve(__dirname, '..', 'build', pathname), { recursive: true }, e => {
    if (e) {
      console.log(e);
    } else {
      console.log('Success');
    }
  });


  let file = await fs.createWriteStream(path.resolve(__dirname, '..', 'build', url.pathname.substring(1)));


  await new Promise( async (resolve, reject) => {

    await request({
      url: url.href,
      'auth': { 'user': '', 'pass': ''}})
    .pipe(file)
    .on('finish', () => {
      console.log('Success Downloading: ' + file.path);
      resolve();
    })
    .on('error', (error) => {
      reject(error);
    })
  }).catch(error => {
    console.log(`Error on Downloading: ${error}`);
  });

}

runPuppeteer(urls).then( () => {

  let filteredUrls = Array.from(new Set(reqUrls))

  filteredUrls.map(url => {
    generateBuild(url);
  })
})
