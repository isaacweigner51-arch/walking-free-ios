const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const bundlePath = path.join(
  projectRoot,
  "dist",
  "public",
  "assets",
  "index-4-07CTL7.js",
);
const snippetPath = path.join(__dirname, "guided-breathing-snippet.js");

const bundle = fs.readFileSync(bundlePath, "utf8");
const compactStart = bundle.indexOf("rf=[");
const readableStart = bundle.indexOf("rf = [");
const start = compactStart >= 0 ? compactStart : readableStart;
const end = bundle.indexOf("function N4", start);

if (start < 0 || end < 0 || end <= start) {
  throw new Error("Could not locate the recovered Guided Breathing component.");
}

const snippet = fs.readFileSync(snippetPath, "utf8").trim();
const patched = `${bundle.slice(0, start)}${snippet}${bundle.slice(end)}`;

fs.writeFileSync(bundlePath, patched);
console.log("Guided Breathing component updated.");
