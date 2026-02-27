const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const serviceAccount = require('../service-account-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const ADMIN_EMAIL = 'clctvr@gmail.com';

getAuth().getUserByEmail(ADMIN_EMAIL)
    .then(user => {
        console.log('Found user:', user.uid);
        return getAuth().setCustomUserClaims(user.uid, { admin: true });
    })
    .then(() => {
        console.log('✅ Admin claim set successfully for:', ADMIN_EMAIL);
        console.log('\nIMPORTANT: Log out and log back in for the claim to take effect.');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    });
