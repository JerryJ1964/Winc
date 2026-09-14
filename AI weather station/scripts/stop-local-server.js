const { execSync } = require('child_process');
try {
  const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Where-Object CommandLine -like \'*server-local*\' | Stop-Process -Force"', { encoding: 'utf8' });
  console.log('stopped:', out);
} catch (e) {
  console.log('no server found or already stopped');
}