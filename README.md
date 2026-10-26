# Styrkeloggen

En enkel app för att logga styrketräningspass, byggd med Next.js och redo att deployas på Netlify.

## Funktioner

- **Logga pass** – datum, passnamn, övningar med set (vikt × reps) och anteckningar.
  Nya set kopierar föregående sets vikt och reps, och övningsnamn föreslås från tidigare pass.
- **Historik** – alla pass, nyast först, med antal set och total volym (kg). Pass kan ändras och tas bort.
- **Personbästa** – tyngsta set och uppskattat 1RM (Epley) per övning.
- **Utveckling** – linjegraf per övning (uppskattat 1RM, tyngsta vikt eller volym per pass) och
  stapeldiagram över total volym per vecka de senaste 12 veckorna. Håll muspekaren över eller tryck
  på grafen för exakta värden, eller öppna tabellvyn.
- **Backup** – exportera och importera loggen som JSON.

Datan sparas i webbläsarens `localStorage`, så den finns kvar mellan besök på samma enhet och
webbläsare men synkas inte mellan enheter. Använd export/import för att flytta eller säkerhetskopiera.

## Kom igång

```bash
npm install
npm run dev
```

Öppna sedan http://localhost:3000.

## Struktur

- `pages/index.js` – startsidan med flikar för historik, personbästa och utveckling
- `components/WorkoutForm.js` – formulär för att skapa och ändra pass
- `components/WorkoutList.js` – historiklistan
- `components/PersonalRecords.js` – tabell med personbästa
- `components/ProgressCharts.js` – grafer över utvecklingen (SVG, inga extra beroenden)
- `lib/workouts.js` – datamodell, beräkningar och lagring i `localStorage`
- `cypress/e2e/basic.cy.js` – end-to-end-test som körs vid deploy på Netlify
