async function run() {
  const res = await fetch('http://localhost:3000/api/models/info');
  const d = await res.json();
  console.log('total:', d.length);
  const seen = new Set();
  let dups = 0;
  d.forEach((i: any) => {
    if (seen.has(i.id)) {
      console.log('DUP:', i.id);
      dups++;
    }
    seen.add(i.id);
  });
  console.log('Total Duplicates:', dups);
  process.exit(0);
}
run();
