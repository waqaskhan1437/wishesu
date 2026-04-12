async function test() {
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    try {
      const res = await fetch(`https://prankwish.com/?cache_buster=${start}`);
      console.log(`Req ${i}: HTTP ${res.status} in ${Date.now() - start}ms`);
    } catch (e) {
      console.error(`Req ${i} failed:`, e.message);
    }
  }
}
test();