// Isolated visual fixture. No account sessions or production database access.
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.resolve(__dirname, "..");
async function main() {
  await esbuild.build({
    absWorkingDir: root, entryPoints: ["tests/fixtures/captain-preview.jsx"], bundle: true, jsx: "automatic", outfile: "audit-evidence/captain-preview.js", loader: { ".wav": "file", ".mp3": "file" },
    plugins: [{ name: "isolate-backend", setup(build) {
      build.onLoad({ filter: /[\\/]lib[\\/]supabase\.js$/ }, () => ({ contents: `const query = { select(){return this},eq(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)} }; const channel = {on(){return this},subscribe(){return this}}; export const supabase = {from(){return query},channel(){return channel},removeChannel(){},realtime:{setAuth:async()=>{}}};`, loader: "js" }));
      build.onLoad({ filter: /[\\/]lib[\\/]captain\.js$/ }, () => ({ contents: `export const requireCaptain=async()=>{}; export const read=async query=>(await query).data; export const captainFunction=async()=>({bans:[],results:[]});`, loader: "js" }));
    } }],
  });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/") { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/captain-preview.css"><title>Captain panel visual fixture</title></head><body style="margin:0;background:#0b1020"><div id="root"></div><script src="/captain-preview.js"></script></body></html>'); return; }
    const file = path.join(root, "audit-evidence", path.basename(pathname));
    if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.setHeader("Content-Type", file.endsWith(".css") ? "text/css" : "application/javascript"); fs.createReadStream(file).pipe(response);
  });
  server.listen(4178, "127.0.0.1", () => console.log("Captain visual fixture: http://127.0.0.1:4178"));
}
main().catch(error => { console.error(error); process.exit(1); });
