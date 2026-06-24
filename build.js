const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "style.css",
  "script.js",
  "sample-names-1000.csv",
  "README.md",
  "vercel.json"
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(dist, file));
  }
}

console.log("Static build ready in dist/ folder.");
