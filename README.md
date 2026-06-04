# NIPPAN POS — Vercel Deployment

Aplikace pro pokladnu a baristy festivalového stánku Nippan Bakery & Matcha Bar.

## Quick start

1. **Setup Firebase** (15 min) — pro cross-device sync
2. **Vlož Firebase URL** do `src/App.jsx` (řádek 21)
3. **Nahraj projekt na GitHub** (5 min)
4. **Připoj GitHub k Vercel** (3 min) — auto-deploy
5. **Otevři URL na všech zařízeních** — bookmark v prohlížeči

---

## KROK 1: Firebase setup (15 min)

Bez Firebase nefunguje sync mezi iPhone a Lenovo tabletem.

### 1.1 Vytvoř projekt
- https://console.firebase.google.com
- **Add project** → název `nippan-pos`
- Google Analytics: **vypni**
- Create

### 1.2 Realtime Database
- V projektu vlevo: **Build → Realtime Database**
- Create Database
- Lokace: `europe-west1` (Belgie)
- Start in **test mode** → Enable

### 1.3 Pravidla
- V Realtime Database → záložka **Rules**
- Smaž obsah, vlož:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
- Publish

### 1.4 Zkopíruj URL
- V Realtime Database vidíš URL ve tvaru:
  `https://nippan-pos-default-rtdb.europe-west1.firebasedatabase.app`
- Zkopíruj **bez koncového lomítka**

### 1.5 Vlož do kódu
- Otevři `src/App.jsx`
- Řádek 21: `const FIREBASE_URL = "";`
- Nahraď za: `const FIREBASE_URL = "https://nippan-pos-default-rtdb.europe-west1.firebasedatabase.app";`

---

## KROK 2: Nahrát na GitHub (5 min)

### 2.1 Vytvoř GitHub účet
- https://github.com/signup (pokud nemáš)

### 2.2 Vytvoř nový repository
- Klikni na **+** vpravo nahoře → **New repository**
- Name: `nippan-pos`
- Public (pro free Vercel)
- **NEinicializuj** s README (necháme prázdné)
- Create repository

### 2.3 Upload souborů
- Na nové stránce repa klikni **uploading an existing file**
- Drag & drop **VŠECHNY soubory a složky** ze složky `nippan-pos-vercel`:
  - `package.json`
  - `vite.config.js`
  - `tailwind.config.js`
  - `postcss.config.js`
  - `index.html`
  - `.gitignore`
  - `README.md`
  - celá složka `src/` (s App.jsx, main.jsx, index.css)
- DŮLEŽITÉ: **NEnahrávej** složku `node_modules` (nemělas ji vůbec, Vercel si nainstaluje sám)
- Commit changes

---

## KROK 3: Vercel deployment (3 min)

### 3.1 Vytvoř Vercel účet
- https://vercel.com/signup
- **Continue with GitHub** (nejjednodušší)

### 3.2 Import projektu
- Po přihlášení klikni **Add New... → Project**
- Najdi `nippan-pos` v seznamu repos
- Klikni **Import**

### 3.3 Konfigurace
- Vercel automaticky detekuje Vite
- Framework Preset: **Vite** (auto)
- Root Directory: `./` (nech)
- Build Command: `npm run build` (auto)
- Output Directory: `dist` (auto)
- **Deploy**

### 3.4 Po deploy
- Po cca 1-2 minutách máš URL: `https://nippan-pos.vercel.app`
  (případně `https://nippan-pos-tvuje-jmeno.vercel.app`)
- Otevři, otestuj

---

## KROK 4: Distribuce týmu (5 min)

### 4.1 Bookmark
- iPhone (Safari):
  - Otevři URL
  - Klepni **Sdílet** (čtverec se šipkou)
  - **Přidat na plochu**
  - Pojmenuj "NIPPAN POS" → Přidat
- Android (Chrome):
  - Otevři URL
  - Menu (⋮) vpravo nahoře
  - **Přidat na plochu** (Add to Home screen)

### 4.2 Pošli týmu
- WhatsApp/SMS brigádníkům: "Aplikace na ploše: [URL]"
- Každý si bookmarkne svůj telefon/tablet
- Test: kasa odešle objednávku → barista vidí do 1 sekundy

---

## Updates po deployi

Když chceš změnu v kódu (nová cena, oprava, nová položka):

1. Změň soubor `src/App.jsx` lokálně NEBO přímo na GitHub.com (klikni Edit na souboru)
2. Commit
3. Vercel **automaticky** zdeploy novou verzi za 1-2 min
4. Tým si v prohlížeči pull-down refreshne → vidí novou verzi

---

## Troubleshooting

### Vidím "LOCAL" odznak v hlavičce
→ FIREBASE_URL je prázdné. Vlož URL do `src/App.jsx` řádek 21, commit, Vercel redeploy.

### Vidím "FB" ale data se neukládají
→ Pravidla Firebase nejsou na public. Otevři Firebase Console → Realtime Database → Rules a nastav:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Vercel build selhává
→ Pravděpodobně chybí soubor. Ověř, že máš v repu všechny soubory ze složky.

### Aplikace se otevírá, ale stránka je prázdná
→ Otevři DevTools (F12) → Console. Pošli mi screenshot chyby.

---

## Bezpečnost

⚠️ Firebase pravidla `read: true, write: true` znamenají, že **kdokoli zná URL může číst/zapisovat data**. Pro festival OK (URL znají jen tvůj tým), ale po festivalu doporučuji:

1. Buďto smaž Firebase projekt (data zmizí)
2. Nebo nastav pravidla na privátní (vyžaduje auth)

---

## Náklady

- **Firebase**: 0 Kč (free tier 10GB/měsíc)
- **Vercel**: 0 Kč (free tier 100GB/měsíc)
- **GitHub**: 0 Kč (free public repo)

Celkem: **0 Kč** pro festival.
