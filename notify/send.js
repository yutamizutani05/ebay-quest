/* Sends the daily reminder web-push to all stored subscriptions.
   The service worker decides whether to actually show it (skips if today already recorded). */
const webpush = require('web-push');

const pub = process.env.VAPID_PUBLIC;
const priv = process.env.VAPID_PRIVATE;
const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@example.com';

if (!pub || !priv) { console.error('Missing VAPID_PUBLIC / VAPID_PRIVATE'); process.exit(1); }
webpush.setVapidDetails(subject, pub, priv);

let subs = [];
try {
  const parsed = JSON.parse(process.env.PUSH_SUBSCRIPTIONS || '[]');
  subs = Array.isArray(parsed) ? parsed : [parsed];
} catch (e) { console.error('PUSH_SUBSCRIPTIONS is not valid JSON'); process.exit(1); }

if (!subs.length) { console.log('No subscriptions configured — nothing to send.'); process.exit(0); }

const payload = JSON.stringify({
  title: 'eBayクエスト',
  body: '今日のクエストがまだです！ボスが待ってるよ ⚔️',
  url: './index.html'
});

(async () => {
  let ok = 0, fail = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s, payload);
      ok++; console.log('sent →', (s.endpoint || '').slice(0, 40) + '...');
    } catch (err) {
      fail++; console.error('failed', err.statusCode || '', (s.endpoint || '').slice(0, 40) + '...');
    }
  }
  console.log(`done: ${ok} sent, ${fail} failed`);
})();
