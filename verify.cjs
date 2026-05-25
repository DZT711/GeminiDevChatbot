const cp = require('child_process');
const server = cp.spawn('node', ['dist/server.cjs']);
let output = '';
server.stdout.on('data', d => {
  output += d.toString();
  if (output.includes('Server running')) {
    console.log('Success!');
    server.kill();
    process.exit(0);
  }
});
server.stderr.on('data', d => {
  console.error("ERR:", d.toString());
});
server.on('exit', code => {
  console.log("Exited with code", code);
  process.exit(code || 0);
});
setTimeout(() => {
  console.log("Timeout");
  server.kill();
  process.exit(1);
}, 3000);
