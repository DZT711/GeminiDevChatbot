const http = require('http');

async function test() {
  const jose = await import('jose');
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');
  const jwt = await new jose.SignJWT({ id: 'test-user', email: 'test@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(JWT_SECRET);

  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({
      prompt: 'hello',
      history: [],
      model: 'gemini-3.5-flash',
      provider: 'google'
    })
  });
  console.log('Status:', res.status);
  
  // read stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value, { stream: true }));
  }
}
test();
