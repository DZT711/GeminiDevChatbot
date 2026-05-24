async function run() {
  const res = await fetch('http://localhost:3000/api/models/info');
  const d = await res.json();
  const m1 = d.filter((m: any) => m.id === 'deepseek-ai/deepseek-v4-pro');
  const m2 = d.filter((m: any) => m.id === 'openai/gpt-oss-120b');
  console.log('Matches 1:', m1.length);
  console.log('Matches 2:', m2.length);
  process.exit();
}
run();
