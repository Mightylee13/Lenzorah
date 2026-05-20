import https from 'https';

const base = process.env.MOVIE_API_BASE || 'https://movieapi.gifted.co.ke';

const req = https.request(
  `${base}/api/v2/trending`,
  {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://example.com',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Authorization',
  }
}, (res) => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", res.headers);
});
req.end();
