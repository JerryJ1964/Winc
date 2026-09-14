// Smoke test for the local server's weather + push endpoints.
const BASE = 'http://localhost:3000';

async function main() {
  // 1) Weather endpoint structure
  const weatherRes = await fetch(`${BASE}/api/weather?location=London`);
  const w = await weatherRes.json();
  console.log('WEATHER location:', w.location);
  console.log('WEATHER nowcast.summary:', JSON.stringify(w.nowcast.summary));
  console.log('WEATHER nowcast.alerts:', JSON.stringify(w.nowcast.alerts));

  // 2) Push: info
  const infoRes = await fetch(`${BASE}/api/push?action=info`);
  console.log('PUSH info:', JSON.stringify(await infoRes.json()));

  // 3) Push: list (empty)
  const listRes = await fetch(`${BASE}/api/push?action=list`);
  console.log('PUSH list:', JSON.stringify(await listRes.json()));

  // 4) Push: register with a clearly-fake subscription (server accepts it; a real
  //    send would fail later but register/list only needs the shape).
  const fakeSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint-1234567890',
    keys: {
      p256dh: 'BL0qkX3T2yN6Wv9lzVp9s7m5d0k8s3X1cR6pLk8vTnE',
      auth: 'qX3tVp7mWl2sD9fZ'
    }
  };
  const regRes = await fetch(`${BASE}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', subscription: fakeSub, lat: 52.3676, lng: 4.9041, label: 'Amsterdam' })
  });
  console.log('PUSH register:', JSON.stringify(await regRes.json()));

  // 5) Push: list again (should show 1 active)
  const list2Res = await fetch(`${BASE}/api/push?action=list`);
  console.log('PUSH list after register:', JSON.stringify(await list2Res.json()));

  // 6) Push: notify (will fetch weather for the fake user => pushed=false because fake sub)
  const notifyRes = await fetch(`${BASE}/api/push?action=notify`);
  console.log('PUSH notify:', JSON.stringify(await notifyRes.json()));

  // 7) Push: unregister
  const unregRes = await fetch(`${BASE}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unregister', endpoint: fakeSub.endpoint })
  });
  console.log('PUSH unregister:', JSON.stringify(await unregRes.json()));
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED', e);
  process.exit(1);
});