const https = require('https');

async function run(){
  for(let i=0;i<3;i++){
    const start = Date.now();
    try {
      const res = await new Promise((r,rj) => {
        https.get('https://prankwish.com/api/health', (res) => r(res)).on('error',rj);
      });
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log(i, res.statusCode, Date.now()-start + 'ms', body);
      });
    } catch(e) {
      console.log(i, 'ERROR', e.message);
    }
  }
}
run();