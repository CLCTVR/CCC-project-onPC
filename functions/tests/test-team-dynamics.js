/**
 * Local Emulator Integration Test: analyzeTeamDynamics
 * 
 * This script sends a mock payload to the locally running analyzeTeamDynamics Cloud Function.
 * It bypasses token signature checks in the emulator by using a mock JWT structure.
 * 
 * How to use:
 * 1. Start the emulators with the auth emulator host env variable set:
 *    Cross-platform (Node script / environment):
 *      $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" (PowerShell)
 *      set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (CMD)
 *      export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" (bash)
 *    Then run:
 *      firebase emulators:start --only functions
 * 
 * 2. In another terminal window, run this test script:
 *      node functions/tests/test-team-dynamics.js
 */

const url = 'http://127.0.0.1:5001/q7-web-app1/us-central1/analyzeTeamDynamics';

// 1. Build a mock JWT header and payload to satisfy callable function authentication checks
const header = {
  alg: "none",
  typ: "JWT"
};

const payload = {
  iss: "https://securetoken.google.com/q7-web-app1",
  aud: "q7-web-app1",
  sub: "admin-uid",
  user_id: "admin-uid",
  email: "clctvr@gmail.com",
  email_verified: true,
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000) - 60
};

// Base64URL helper
function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const token = `${base64url(header)}.${base64url(payload)}.dummy_signature`;

// 2. Define the baseline team assessment payload
const requestData = {
  data: {
    users: [
      { name: "Alice", values: [8, 7, 6, 5, 4, 3, 2, 1, 9] },
      { name: "Bob", values: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
    ]
  }
};

console.log(`Sending request to ${url}...`);

// 3. Execute HTTP POST request
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(requestData)
})
.then(async (res) => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  
  if (!res.ok) {
    console.error(`\n❌ Request failed with HTTP Status ${res.status}`);
    console.error(data);
    process.exit(1);
  }
  
  console.log('\n✅ Response received successfully:\n');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('\n❌ Network or configuration error:', err.message);
  process.exit(1);
});
