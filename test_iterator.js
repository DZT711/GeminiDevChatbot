async function run() {
  const arr = [1, 2, 3];
  
  async function* gen() {
     for (const item of arr) {
        yield item;
     }
  }
  
  const iterator = gen();
  const iter = iterator[Symbol.asyncIterator]();
  const first = await iter.next();
  console.log("First:", first.value);
  for await (const item of iterator) {
     console.log("Rest:", item);
  }
}
run();
