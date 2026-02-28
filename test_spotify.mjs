import https from 'https';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('No Spotify credentials in env');
  process.exit(0);
}

const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
const postData = 'grant_type=client_credentials';

const options = {
  hostname: 'accounts.spotify.com',
  path: '/api/token',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + credentials,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.access_token) {
      console.log('Token OK:', parsed.access_token.substring(0, 20) + '...');
      console.log('Expires in:', parsed.expires_in);
      
      // Now test artist search
      const searchReq = https.get({
        hostname: 'api.spotify.com',
        path: '/v1/search?q=C.O.F.F.I.N&type=artist&limit=3',
        headers: {
          'Authorization': 'Bearer ' + parsed.access_token
        }
      }, (searchRes) => {
        let searchData = '';
        searchRes.on('data', d => searchData += d);
        searchRes.on('end', () => {
          console.log('Search status:', searchRes.statusCode);
          if (searchRes.statusCode === 200) {
            const result = JSON.parse(searchData);
            result.artists?.items?.forEach(a => console.log('Artist:', a.name, a.id));
          } else {
            console.log('Search error:', searchData.substring(0, 200));
          }
        });
      });
      searchReq.on('error', e => console.error('Search error:', e.message));
    } else {
      console.log('Token ERROR:', JSON.stringify(parsed));
    }
  });
});
req.on('error', e => console.error('Token error:', e.message));
req.write(postData);
req.end();
