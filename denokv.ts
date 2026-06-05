// main.ts

// 1. Open the KV database
const kv = await Deno.openKv();

// 2. CREATE / UPDATE: Storing data
const user = { username: "Alice", email: "alice@example.com" };
await kv.set(["users", "alice"], user);
console.log("User saved!");

// 3. READ: Retrieving data
const result = await kv.get(["users", "alice"]);
if (result.value) {
  console.log("User found:", result.value);
}
