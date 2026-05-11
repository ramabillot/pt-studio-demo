// download-images.mjs — v5 (YouTube thumbnails)
// Scarica il thumbnail YouTube di ogni esercizio — unico, gratuito, sempre corretto.
// Esegui con: node download-images.mjs

import { writeFileSync, mkdirSync } from "fs";

const EXERCISES = [
  { id: 1,  name: "Curl con bilanciere",        yt: "kwG2ipFRgfo" },
  { id: 2,  name: "Curl con manubri alternati", yt: "ykJmrZ5v0Oo" },
  { id: 3,  name: "Tricep pushdown al cavo",    yt: "2-LAMcpzODU"  },
  { id: 4,  name: "Skull crushers",             yt: "d_KZxkY_0cM"  },
  { id: 5,  name: "Hammer curl",                yt: "zC3nLlEvin4"  },
  { id: 6,  name: "Lento avanti con bilanciere",yt: "2yjwXTZQDDI"  },
  { id: 7,  name: "Alzate laterali",            yt: "3VcKaXpzqRo"  },
  { id: 8,  name: "Facepull al cavo",           yt: "rep-qVOkqgk"  },
  { id: 9,  name: "Arnold press",               yt: "3ml7BH7mNwQ"  },
  { id: 10, name: "Alzate frontali",            yt: "gkiTb0RKMCg"  },
  { id: 11, name: "Stacco da terra",            yt: "op9kVnSso6Q"  },
  { id: 12, name: "Trazioni alla sbarra",       yt: "eGo4IYlbE5g"  },
  { id: 13, name: "Rematore con bilanciere",    yt: "9efgcAjQe7E"  },
  { id: 14, name: "Lat machine presa larga",    yt: "CAwf7n6Tuuc"  },
  { id: 15, name: "Seated cable row",           yt: "GZbfZ033f74"  },
  { id: 16, name: "Squat con bilanciere",       yt: "ultWZbUMPL8"  },
  { id: 17, name: "Leg press 45°",              yt: "IZxyjW7MPJQ"  },
  { id: 18, name: "Romanian deadlift",          yt: "JCXUYuzwNrM"  },
  { id: 19, name: "Leg curl sdraiato",          yt: "1Tq3QdYUuHs"  },
  { id: 20, name: "Calf raises in piedi",       yt: "gwLzBJYoWlQ"  },
];

const OUT = "public/exercises";
mkdirSync(OUT, { recursive: true });

// YouTube offre più qualità — proviamo dalla migliore
const QUALITIES = ["maxresdefault", "hqdefault", "sddefault", "mqdefault"];

async function downloadBest(ytId, destPath) {
  for (const q of QUALITIES) {
    const url = `https://img.youtube.com/vi/${ytId}/${q}.jpg`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      // YouTube restituisce un'immagine 120x90 grigia se non trova il formato
      // la scartiamo se è troppo piccola (< 5kb)
      if (buf.length < 5000) continue;
      writeFileSync(destPath, buf);
      return q; // qualità usata
    } catch { continue; }
  }
  return null;
}

let ok = 0, fail = 0;

for (const ex of EXERCISES) {
  process.stdout.write(`[${ex.id}/20] ${ex.name} ... `);
  const quality = await downloadBest(ex.yt, `${OUT}/${ex.id}-0.jpg`);
  if (quality) {
    console.log(`✅ (${quality})`);
    ok++;
  } else {
    console.log("❌ fallito");
    fail++;
  }
  await new Promise(r => setTimeout(r, 150));
}

console.log("\n─────────────────────────────────────────");
console.log(`Finito!  ✅ ${ok} OK   ❌ ${fail} falliti`);
console.log(`Immagini in: ${OUT}/`);
console.log("Ora premi F5 nel browser.");
