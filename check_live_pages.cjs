const https = require('https');

const options = {
  hostname: 'prankwish.com',
  path: '/api/pages',
  method: 'GET',
  headers: {
    'X-API-Key': 'wishesu_2howEY1vTXw2tuPmQCR557JmljhxWE1IV3gBU5BSgbeemZNE',
    'User-Agent': 'Node.js/Junie'
  }
};

https.get(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log(`Fetched ${data.length} pages.`);
      const withLorem = data.filter(p => {
        const str = JSON.stringify(p);
        return str.toLowerCase().includes('lorem') || str.toLowerCase().includes('ipsum');
      });
      console.log(`Pages with 'Lorem': ${withLorem.length}`);
      withLorem.forEach(p => console.log(`- ${p.title} (${p.slug})`));
      
      // Let's also check for specific blocks that we updated.
      // e.g. "We create personalized video messages"
      // or "Tell Your Story"
    } catch(e) {
      console.error('Error parsing:', e.message);
      console.error('Body preview:', body.substring(0, 100));
    }
  });
}).on('error', e => console.error(e.message));
