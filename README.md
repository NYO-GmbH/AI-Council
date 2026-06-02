# NYO AI Council

> [!WARNING]
> **Proof of Concept** – Dieses Projekt ist ein experimenteller Prototyp und nicht für den Produktionseinsatz geeignet. Es gibt keine Authentifizierung, kein Rate-Limiting und keine Härtung gegen Missbrauch. Nur in vertrauenswürdigen, privaten Umgebungen betreiben.

NYO AI Council ist eine KI-Rats-Anwendung, entwickelt mit Nuxt 4. Statt eines einzelnen Chatbots führt der Rat einen moderierten Rundtisch aus KI-Mitgliedern mit unterschiedlichen Rollen, Persönlichkeiten und Zielen durch.

Jede Sitzung verläuft in Gesprächsrunden. Mitglieder liefern prägnante Beiträge, du kannst laufende Sitzungen mit neuen Impulsen unterbrechen, und das System erstellt ein Abschlussurteil mit:
- einer Zusammenfassung
- einer Gewinneridee
- einem Abstimmungsergebnis

## Funktionen

- Ratsmitglieder verwalten (erstellen, bearbeiten, aktivieren/pausieren, löschen)
- Standard-Ratspersonen per Seed-Endpunkt anlegen
- Themensitzungen mit konfigurierbarer Rundenzahl starten
- Live-Protokoll verfolgen, während Mitglieder sprechen
- Laufende Sitzungen mit Nutzerimpulsen unterbrechen
- Sitzungen vorzeitig beenden oder automatisch abschließen lassen
- Sitzungen, Nachrichten und Mitgliederdaten in SQLite via Drizzle ORM persistieren
- LM Studio URL und Modellname per UI konfigurieren (Zahnrad-Icon in der Kopfzeile)

## Tech Stack

- Nuxt 4 + Vue 3 + Nuxt UI
- Nitro Server API Routes
- Drizzle ORM + SQLite
- Vercel AI SDK mit OpenAI-kompatiblem LM Studio Endpunkt

---

## Lokale Entwicklung

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Datenbank vorbereiten

```bash
npm run db:push
```

### 3. Modell-Endpunkt starten

Standardmäßig verbindet sich das Council mit LM Studio unter:

```
http://127.0.0.1:1235/v1
```

URL und Modellname können entweder über Umgebungsvariablen (`.env`) oder direkt in der App über das Einstellungs-Menü (Zahnrad-Icon) angepasst werden.

### 4. App starten

```bash
npm run dev
```

Öffne die App, gehe zu `/council/members` und generiere Beispielmitglieder, bevor du deine erste Sitzung startest.

---

## Docker-Deployment

### Schnellstart

```bash
docker compose up --build
```

Die App ist danach unter [http://localhost:3000](http://localhost:3000) erreichbar.

### Port anpassen

Standardmäßig wird Port `3000` verwendet. Zum Ändern entweder eine `.env`-Datei anlegen:

```env
HOST_PORT=3001
```

oder den Port inline übergeben:

```bash
HOST_PORT=3001 docker compose up
```

### LM Studio verbinden

LM Studio muss auf dem Host-Rechner laufen. Docker Desktop (Mac/Windows) löst `host.docker.internal` automatisch auf. Auf Linux wird der Alias über den `extra_hosts`-Eintrag in `docker-compose.yml` gesetzt.

Die Verbindung kann über die `.env`-Datei konfiguriert werden:

```env
LM_STUDIO_BASE_URL=http://host.docker.internal:1235/v1
LM_STUDIO_MODEL_NAME=qwen/qwen3-4b-2507
```

Alternativ lassen sich URL und Modellname jederzeit direkt in der App über das Einstellungs-Menü (Zahnrad-Icon) ändern – ohne Neustart des Containers.

### Persistenz

Zwei Docker Volumes sichern den Zustand über Container-Neustarts hinweg:

| Volume | Inhalt |
|--------|--------|
| `db_data` | SQLite-Datenbankdatei (Sitzungen, Mitglieder, Nachrichten) |
| `kv_data` | LM Studio Einstellungen (per UI gespeichert) |

Beim ersten Start werden Datenbankmigrationen automatisch ausgeführt.

### Datenbank zurücksetzen

```bash
docker compose down
docker volume rm ai_council_db_data
docker compose up
```

Beide Volumes löschen (inkl. gespeicherter Einstellungen):

```bash
docker volume rm ai_council_db_data ai_council_kv_data
```

---

## Nützliche Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Lokalen Entwicklungsserver starten |
| `npm run build` | Produktions-Build erstellen |
| `npm run preview` | Produktions-Build vorschauen |
| `npm run typecheck` | Nuxt-Typprüfung ausführen |
| `npm run db:generate` | Drizzle-Migrationsdateien generieren |
| `npm run db:push` | Schema-Änderungen in SQLite übertragen |
| `npm run db:migrate` | Migrationen ausführen |
| `npm run db:studio` | Drizzle Studio öffnen |

## Routen

- `/council` — Ratskammer und Live-Sitzungen
- `/council/members` — Ratsmitgliederverwaltung

## Hinweise

- SSR ist deaktiviert (`ssr: false`) in `nuxt.config.ts`.
- Sitzungslogik und Urteilsgenerierung befinden sich unter `server/api/council/**`.
