# Confronto screenshot (visual regression)

Serve a verificare che un refactor **non cambi niente a schermo**. Supabase è simulato (dati finti, data fissa 2026-10-02): non tocca il database vero.
Pensato per l'ambiente cloud di Claude (Linux, Chromium di Playwright già installato).

```bash
# 1. build con Supabase finto + preview
VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=x npm run build
setsid nohup npx vite preview --port 4173 >/dev/null 2>&1 &

# 2. foto "prima" (sul commit di partenza) e "dopo"
cd tools/vr
PW_CHROMIUM=/opt/pw-browsers/chromium node snap.mjs base    # 28 schermate mobile + desktop
#   ...modifiche + nuova build...
PW_CHROMIUM=/opt/pw-browsers/chromium node snap.mjs after
python3 cmp.py base after   # "px>40: 0" = solo rumore; numeri alti = differenza vera
```

- Le cartelle `base/` e `after/` non vanno committate.
- Il canvas animato del login è coperto (rettangolo magenta).
- Differenze su schermate con animazioni (es. admin-stats) possono essere solo tempismo: riprovare con attesa più lunga.
