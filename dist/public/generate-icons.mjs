// Run once: node generate-icons.mjs
// Generates PNG icons from the SVG for PWA and Apple touch icon
import { createCanvas } from "canvas";
import fs from "fs";

const sizes = [192, 512, 180];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  const radius = size * 0.222;
  ctx.fillStyle = "#1a8f7a";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.arcTo(size, 0, size, radius, radius);
  ctx.lineTo(size, size - radius);
  ctx.arcTo(size, size, size - radius, size, radius);
  ctx.lineTo(radius, size);
  ctx.arcTo(0, size, 0, size - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
  ctx.fill();

  // Inner circle glow
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.29, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = "white";
  ctx.font = `300 ${size * 0.355}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WF", size / 2, size / 2 + size * 0.03);

  const name =
    size === 180 ? "apple-touch-icon.png" :
    size === 192 ? "icon-192.png" :
    "icon-512.png";

  fs.writeFileSync(name, canvas.toBuffer("image/png"));
  console.log(`Generated ${name}`);
}
