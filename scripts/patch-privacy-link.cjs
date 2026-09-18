const fs = require("fs");
const path = require("path");

const bundlePath = path.join(
  path.resolve(__dirname, ".."),
  "dist",
  "public",
  "assets",
  "index-4-07CTL7.js",
);

let bundle = fs.readFileSync(bundlePath, "utf8");

const oldLink =
  'href:"https://www.privacypolicygenerator.info",target:"_blank",rel:"noopener noreferrer"';
const newLink =
  'href:"/privacy-policy.html","aria-label":"Open Walking Free Privacy Policy"';

if (!bundle.includes(newLink)) {
  const matches = bundle.split(oldLink).length - 1;
  if (matches !== 1) {
    throw new Error(`Expected one broken Privacy Policy link, found ${matches}.`);
  }
  bundle = bundle.replace(oldLink, newLink);
}

fs.writeFileSync(bundlePath, bundle);
console.log("Privacy Policy now opens the bundled Walking Free policy.");
