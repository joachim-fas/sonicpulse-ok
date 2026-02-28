import https from 'https';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('No Spotify credentials in env');
  process.exit(0);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Get fresh token
const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
const postData = 'grant_type=client_credentials';
const tokenResult = await makeRequest({
  hostname: 'accounts.spotify.com',
  path: '/api/token',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + credentials,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
}, postData);

const tokenData = JSON.parse(tokenResult.data);
const token = tokenData.access_token;
console.log('Token:', token ? token.substring(0, 20) + '...' : 'FAILED');

if (!token) {
  console.log('Token error:', tokenResult.data);
  process.exit(1);
}

// Test 1: Search endpoint (known to give 403)
const searchResult = await makeRequest({
  hostname: 'api.spotify.com',
  path: '/v1/search?q=C.O.F.F.I.N&type=artist&limit=3',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json'
  }
});
console.log('Search status:', searchResult.status);
if (searchResult.status !== 200) {
  console.log('Search error:', searchResult.data.substring(0, 200));
}

// Test 2: Direct artist endpoint with known ID
const artistResult = await makeRequest({
  hostname: 'api.spotify.com',
  path: '/v1/artists/0cYqMEfM4OQv6AJrlhRhN8',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json'
  }
});
console.log('Artist endpoint status:', artistResult.status);
if (artistResult.status === 200) {
  const artist = JSON.parse(artistResult.data);
  console.log('Artist:', artist.name, '| Followers:', artist.followers?.total);
} else {
  console.log('Artist error:', artistResult.data.substring(0, 200));
}

// Test 3: Recommendations endpoint
const recoResult = await makeRequest({
  hostname: 'api.spotify.com',
  path: '/v1/recommendations?seed_artists=0cYqMEfM4OQv6AJrlhRhN8&limit=3',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json'
  }
});
console.log('Recommendations status:', recoResult.status);
