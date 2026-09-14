// Generates VAPID key pairs for Web Push (RFC 8292).
// Run: node scripts/generate-vapid.js
// https://www.npmjs.com/package/web-push
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);