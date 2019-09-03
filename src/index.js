const { Cluster } = require('puppeteer-cluster');
const path = require('path');
const fs = require('fs');
const request = require('request');

const urls = [
];
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

        let parse = path.parse(response.url());

        if(parse.ext == '.woff') {
          
          let { dir, name} = parse;

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

  urls.map(async url => {
    await cluster.queue(url);
  })

  await cluster.idle();
  await cluster.close();

}




generateBuild = async url => {
  url = new URL(url);
  
  pathname = path.parse(url.pathname).dir.replace(/^\.*\/|\/?[^\/]+\.[a-z]|\/$/g, '');

  await fs.mkdirSync(path.resolve(__dirname, '..', 'build', pathname), { recursive: true }, e => {
    if (e) {
      console.log(e);
    } else {
      console.log('Success');
    }
  });

  await new Promise( async (resolve, reject) => {

    let response = await request({
      url: url.href,
      'auth': { 'user': '', 'pass': ''}});


    response.on('response', (res) => {
      
      if(res.statusCode == 200) {
        let file = fs.createWriteStream(path.resolve(__dirname, '..', 'build', url.pathname.substring(1)));
        console.log(`Success on downloading: ${file.path}`);
        response.pipe(file);
        resolve();
      } 

      if(res.statusCode == 404) {
        reject(`(404) ${url.href}`);
      }

    }).on('error', (error) => {
      reject(error);
    })

    
  }).catch(error => {
    console.log(`Error on downloading: ${error}`);
  });

}

runPuppeteer(urls).then( () => {
  let filteredUrls = Array.from(new Set(reqUrls))
  filteredUrls.map( url =>  generateBuild(url) )
})
