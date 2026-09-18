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

const replacements = [
  {
    label: "application shell",
    from: 'className:"min-h-[100dvh] flex flex-col md:flex-row bg-background sanctuary-glow"',
    to: 'className:"wf-app-shell min-h-[100dvh] flex flex-col md:flex-row bg-background sanctuary-glow"',
  },
  {
    label: "main content",
    from: 'c.jsx("main",{className:"flex-1 w-full overflow-y-auto pb-20 md:pb-0 gold-glow",children:e})',
    to: 'c.jsx("main",{className:"wf-app-main flex-1 w-full overflow-y-auto pb-20 md:pb-0 gold-glow",children:e})',
  },
  {
    label: "mobile navigation",
    from: 'c.jsx("nav",{className:"fixed bottom-0 left-0 right-0 border-t border-border/60 bg-card/85 backdrop-blur-xl md:hidden z-40",children:',
    to: 'c.jsx("nav",{className:"wf-mobile-nav fixed bottom-0 left-0 right-0 border-t border-border/60 bg-card/85 backdrop-blur-xl md:hidden z-40",children:',
  },
  {
    label: "mobile navigation items",
    from: 'c.jsxs("div",{className:"flex items-center h-16 px-1 overflow-x-auto scrollbar-none gap-0.5",children:',
    to: 'c.jsxs("div",{className:"wf-mobile-nav-items flex items-center h-16 px-1 overflow-x-auto scrollbar-none gap-0.5",children:',
  },
];

for (const replacement of replacements) {
  if (bundle.includes(replacement.to)) continue;
  const matches = bundle.split(replacement.from).length - 1;
  if (matches !== 1) {
    throw new Error(
      `Expected one ${replacement.label} target, found ${matches}.`,
    );
  }
  bundle = bundle.replace(replacement.from, replacement.to);
}

fs.writeFileSync(bundlePath, bundle);
console.log("iPhone viewport and bottom navigation updated.");
