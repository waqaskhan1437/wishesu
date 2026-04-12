const https = require('https');
async function run(){
  for(let i=0;i<3;i++){
    const start = Date.now();
    try {
      const res = await new Promise((r,rj) => https.get('https://prankwish.com/blog', res => r(res)).on('error',rj));
      res.resume();
      console.log(i, res.statusCode, Date.now()-start + 'ms');
    } catch(e){}
  }
}
run();