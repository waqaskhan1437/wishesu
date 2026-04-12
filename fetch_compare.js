import fs from 'fs';

async function fetchSite(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      html: html.substring(0, 1500) // Get the head and start of body
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  const village = await fetchSite('https://villagewishes.com/');
  const prank = await fetchSite('https://prankwish.com/');
  
  fs.writeFileSync('village.json', JSON.stringify(village, null, 2));
  fs.writeFileSync('prank.json', JSON.stringify(prank, null, 2));
  
  console.log("Fetched both sites.");
}

main();