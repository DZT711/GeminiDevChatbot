import fetch from 'node-fetch';
async function test() {
  const repoRes = await fetch("https://api.github.com/repos/DZT711/React");
  console.log(repoRes.status, repoRes.ok);
}
test();
