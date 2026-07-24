import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/web/public/portraits");
mkdirSync(outDir, { recursive: true });

function card({ id, bg, mid, skin, hair, accent, label, extras = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity=".55"/>
      <stop offset="70%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="640" fill="#14110e"/>
  <rect width="512" height="640" fill="url(#glow)"/>
  <ellipse cx="256" cy="520" rx="170" ry="34" fill="#000" opacity=".35"/>
  <circle cx="256" cy="390" r="168" fill="url(#bg)"/>
  <circle cx="256" cy="208" r="86" fill="${skin}"/>
  <ellipse cx="256" cy="148" rx="92" ry="48" fill="${hair}"/>
  <path d="M170 220c18 74 154 74 172 0" fill="${hair}" opacity=".9"/>
  <rect x="176" y="286" width="160" height="210" rx="48" fill="${mid}"/>
  <circle cx="228" cy="208" r="8" fill="#1a1410"/>
  <circle cx="284" cy="208" r="8" fill="#1a1410"/>
  <path d="M236 236c12 14 28 14 40 0" fill="none" stroke="#1a1410" stroke-width="5" stroke-linecap="round"/>
  ${extras}
  <text x="256" y="580" text-anchor="middle" fill="#f4ebe0" font-family="Arial Black, Arial, sans-serif" font-size="36" letter-spacing="2">${label}</text>
</svg>`;
}

const portraits = {
  emi: card({
    id: "emi",
    bg: "#0f6f7a",
    mid: "#18aab8",
    skin: "#be8063",
    hair: "#191919",
    accent: "#f5bf25",
    label: "EMI",
    extras: `<path d="M190 300h132v34H190z" fill="#f5bf25"/><path d="M210 334h92v120H210z" fill="#26272b"/>`
  }),
  "charlie-morningstar": card({
    id: "charlie-morningstar",
    bg: "#7a1c1c",
    mid: "#d74339",
    skin: "#f3ddd0",
    hair: "#f5dfbd",
    accent: "#f4d083",
    label: "CHARLIE",
    extras: `<path d="M168 300c40-28 136-28 176 0v40c-48-22-128-22-176 0z" fill="#f4d083"/><path d="M200 340h112v150H200z" fill="#281b25"/>`
  }),
  phil: card({
    id: "phil",
    bg: "#c9a40a",
    mid: "#f4d21f",
    skin: "#f4d21f",
    hair: "#171717",
    accent: "#2464a8",
    label: "PHIL",
    extras: `
      <ellipse cx="256" cy="250" rx="110" ry="130" fill="#f4d21f"/>
      <circle cx="220" cy="230" r="16" fill="#fff"/><circle cx="292" cy="230" r="16" fill="#fff"/>
      <circle cx="224" cy="234" r="8" fill="#171717"/><circle cx="296" cy="234" r="8" fill="#171717"/>
      <ellipse cx="256" cy="278" rx="28" ry="18" fill="#171717"/>
      <rect x="196" y="360" width="120" height="90" rx="18" fill="#2464a8"/>
      <text x="256" y="160" text-anchor="middle" fill="#171717" font-size="42" font-family="Arial Black,Arial">•••</text>`
  }),
  "banana-fortnite": `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640" role="img" aria-label="BANANA">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2f6b3a"/><stop offset="100%" stop-color="#1d3b24"/>
    </linearGradient>
  </defs>
  <rect width="512" height="640" fill="#14110e"/>
  <rect width="512" height="640" fill="url(#bg)" opacity=".85"/>
  <path d="M180 120c-10 120 20 280 70 360 40-90 90-210 70-360-20-8-90-8-140 0z" fill="#f2c012"/>
  <path d="M220 150c8 90 18 200 34 290" fill="none" stroke="#c9970a" stroke-width="18" stroke-linecap="round"/>
  <circle cx="250" cy="280" r="10" fill="#1a1410"/><circle cx="290" cy="275" r="10" fill="#1a1410"/>
  <path d="M255 310c12 12 28 10 38-2" fill="none" stroke="#1a1410" stroke-width="5" stroke-linecap="round"/>
  <text x="256" y="580" text-anchor="middle" fill="#f4ebe0" font-family="Arial Black, Arial, sans-serif" font-size="36" letter-spacing="2">BANANA</text>
</svg>`,
  "carl-johnson": card({
    id: "carl-johnson",
    bg: "#1f5a2a",
    mid: "#2f7a3a",
    skin: "#6b4428",
    hair: "#1a120e",
    accent: "#c4a35a",
    label: "CJ",
    extras: `<rect x="188" y="300" width="136" height="40" fill="#c4a35a"/><rect x="200" y="340" width="112" height="150" fill="#2a3d5c"/><text x="256" y="328" text-anchor="middle" fill="#1a120e" font-size="18" font-family="Arial Black,Arial">GROVE</text>`
  }),
  "order-number-67": card({
    id: "order-number-67",
    bg: "#3a176e",
    mid: "#6b2fd6",
    skin: "#c48a6a",
    hair: "#1a1a1a",
    accent: "#f0c41a",
    label: "67",
    extras: `<rect x="186" y="300" width="140" height="48" rx="8" fill="#f0c41a"/><text x="256" y="334" text-anchor="middle" fill="#1a1410" font-size="28" font-family="Arial Black,Arial">#67</text><rect x="200" y="348" width="112" height="140" fill="#2a2438"/>`
  }),
  "simao-cowboy": card({
    id: "simao-cowboy",
    bg: "#5c3a1c",
    mid: "#8b5a2b",
    skin: "#c48a6a",
    hair: "#2a1a12",
    accent: "#c4a35a",
    label: "JACK",
    extras: `
      <ellipse cx="256" cy="120" rx="120" ry="28" fill="#5c3a1c"/>
      <path d="M176 140h160l-20 36H196z" fill="#8b5a2b"/>
      <rect x="196" y="300" width="120" height="180" fill="#3d4a5c"/>
      <path d="M210 300h92l-16 40h-60z" fill="#c4a35a"/>`
  }),
  "look-212": card({
    id: "look-212",
    bg: "#1a1a1a",
    mid: "#2c2c2c",
    skin: "#c49a7a",
    hair: "#1a1a1a",
    accent: "#c0c0c0",
    label: "212",
    extras: `<rect x="190" y="300" width="132" height="42" fill="#c0c0c0"/><rect x="204" y="342" width="104" height="150" fill="#1e2430"/><text x="256" y="330" text-anchor="middle" fill="#111" font-size="22" font-family="Arial Black,Arial">212</text>`
  }),
  "meia-noite": card({
    id: "meia-noite",
    bg: "#241f33",
    mid: "#37324e",
    skin: "#b77b5a",
    hair: "#141319",
    accent: "#9d7be9",
    label: "A&amp;E",
    extras: `<rect x="190" y="300" width="132" height="200" rx="36" fill="#191824"/><circle cx="256" cy="340" r="18" fill="#9d7be9" opacity=".85"/>`
  })
};

for (const [id, svg] of Object.entries(portraits)) {
  const file = path.join(outDir, `${id}.svg`);
  writeFileSync(file, svg);
  console.log("wrote", file);
}
console.log("done", Object.keys(portraits).length);
