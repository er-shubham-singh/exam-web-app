// utils/starterCodes.js
export const STARTER_JS_READALL = `// Universal stdin reader - works in Node/ESM, Deno and common sandboxes.
// Reads all stdin tokens, parses first two as integers, prints their sum.

async function readAllStdin() {
  // Deno
  if (typeof Deno !== "undefined" && Deno?.stdin && Deno.stdin.readable) {
    try {
      const reader = Deno.stdin.readable.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      try { reader.releaseLock(); } catch (e) {}
      let total = 0;
      for (const c of chunks) total += c.length;
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      return new TextDecoder().decode(out);
    } catch (e) {
      return "";
    }
  }

  // Node
  if (typeof process !== "undefined" && process?.stdin) {
    return await new Promise((resolve) => {
      let data = "";
      try { process.stdin.setEncoding("utf8"); } catch (e) {}
      const onData = (chunk) => { data += chunk; };
      const onEnd = () => { cleanup(); resolve(data); };
      const cleanup = () => {
        try { process.stdin.removeListener("data", onData); } catch (e) {}
        try { process.stdin.removeListener("end", onEnd); } catch (e) {}
      };
      process.stdin.on("data", onData);
      process.stdin.on("end", onEnd);
      // fallback short wait for sandboxes that never send 'end'
      setTimeout(() => { cleanup(); resolve(data); }, 50);
    });
  }

  return "";
}

(async function main() {
  const raw = await readAllStdin();
  const tokens = (raw || "").trim().split(/\\s+/).filter(Boolean);
  const a = Number(tokens[0] ?? 0);
  const b = Number(tokens[1] ?? 0);
  const sum = (Number.isNaN(a) ? 0 : a) + (Number.isNaN(b) ? 0 : b);
  console.log(sum);
})();`;
