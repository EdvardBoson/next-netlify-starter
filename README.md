# Arena – digital plattform för idrott & gym

Arena är ett verktyg för att digitalisera vardagen i idrottsföreningar och gym. En och samma plattform hanterar
medlemmar, schema och bokning, incheckning, lag och närvaro (inklusive underlag för LOK-stöd) samt fakturering.

Den här versionen är en fungerande **MVP** som går att demonstrera direkt för kunder: den startar med realistisk
exempeldata och sparar ändringar i webbläsaren.

## Moduler

| Modul | Vad den gör |
| --- | --- |
| **Översikt** | Nyckeltal: aktiva medlemmar, återkommande intäkter (MRR), incheckningar, beläggning, obetalt, LOK-grundande sammankomster. |
| **Medlemmar** | Medlemsregister med sök, filter, medlemskap, lagtillhörighet och CSV-export. |
| **Schema & bokning** | Veckoschema, återkommande pass, bokning med kapacitet, kö och automatisk uppflyttning vid avbokning. |
| **Incheckning** | Kioskläge för reception/surfplatta. Fungerar med streckkods-/QR-läsare. Nekar inaktiva medlemmar och varnar för förfallna fakturor. |
| **Lag & närvaro** | Lag/grupper, närvarorapportering per sammankomst, närvaro per spelare och LOK-stödsbedömning med CSV-export. |
| **Ekonomi** | Medlemskap och priser, fakturagenerering per period (idempotent), betalstatus och export. |
| **Inställningar** | Organisationsuppgifter, export/import av all data (JSON) och återställning av exempeldata. |

## Kom igång

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # enhetstester för affärslogiken
npm run build    # produktionsbygge
```

Projektet deployas till Netlify som tidigare (`netlify.toml`).

## Arkitektur

```
lib/logic.mjs     Ren affärslogik (bokning, kö, incheckning, fakturering, LOK, statistik, CSV) – testad
lib/seed.mjs      Exempeldata relativt dagens datum
lib/store.js      React-context som håller state och sparar i localStorage
components/       Layout och små UI-komponenter
pages/            En sida per modul (Next.js pages router)
tests/            Enhetstester (node:test)
```

All affärslogik är rena funktioner `(state, …) => { state, … } | { error }`. Det gör dem lätta att testa och att
flytta till ett backend-API utan att skriva om reglerna.

## LOK-stöd

Närvaromodulen bedömer om en sammankomst är LOK-stödsgrundande enligt standardreglerna i `LOK_RULES`
(7–25 år, minst 3 deltagare, minst 60 minuter, max 30 deltagare räknas). Reglerna ändras ibland –
kontrollera alltid mot Riksidrottsförbundets aktuella regler innan rapportering.

## Färdplan mot produktion

MVP:n sparar data lokalt per webbläsare. För att använda Arena i skarp drift hos en kund:

1. **Backend & databas** – ersätt `load`/`save` i `lib/store.js` med API-anrop (t.ex. Netlify Functions + Postgres
   via Supabase/Neon). Logiken i `lib/logic.mjs` kan köras oförändrad på servern.
2. **Inloggning & roller** – admin, receptionist, tränare/ledare och medlem (t.ex. BankID eller e-postlänk).
3. **GDPR** – personuppgiftsbiträdesavtal, behörighetsstyrning, loggning och gallringsrutiner för medlemsdata.
4. **Betalningar** – Swish, autogiro (Bankgirot) och kortbetalning (t.ex. Stripe), automatiska påminnelser.
5. **Medlemsapp** – självservice: boka/avboka pass, digitalt medlemskort med QR-kod, betala avgifter.
6. **Integrationer** – IdrottOnline/LOK-rapportering, passersystem/dörrlås, bokföring (Fortnox/Visma).
7. **Kommunikation** – e-post/SMS-utskick till lag och medlemsgrupper.
