# Plan from Issue

AI-gestützte Analyse von User Stories, GitHub Issues oder Ticket-Beschreibungen — generiert strukturierte Implementierungspläne als gestreamtes JSON.

## Features

- **Zwei Eingabemodi** — Text manuell eingeben oder ein GitHub Issue per URL importieren
- **Streaming-Analyse** — Implementierungsplan wird in Echtzeit via AI SDK gestreamt
- **Strukturierter Output** — Summary, betroffene Bereiche, Risiken (mit Severity), Implementierungsschritte, Test-Ideen, Approval-Gate
- **Editierbarer Canvas** — Plan nach der Generierung interaktiv bearbeiten
- **UI-Mockup-Vorschau** — Generative UI-Vorschau für Pläne mit Frontend-Bezug
- **Flexibler Provider** — Beliebiger OpenAI-kompatibler Provider (API Key, Model ID, Base URL konfigurierbar)
- **Dark Mode** — Vollständig unterstützt

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, Edge Runtime)
- [AI SDK](https://sdk.vercel.ai) (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- [Zod](https://zod.dev) 4 für Schema-Validierung
- [Tailwind CSS](https://tailwindcss.com) 4
- React 19 mit React Compiler

## Quickstart

```bash
pnpm install
pnpm dev
```

App läuft auf [http://localhost:3000](http://localhost:3000).

## Konfiguration

Alle Einstellungen werden im Browser (localStorage) gespeichert und über das Settings-Panel in der UI konfiguriert:

| Einstellung | Beschreibung | Default |
|---|---|---|
| Provider API Key | OpenAI (oder kompatibler) API Key | — |
| Model ID | Modell-Bezeichner | `gpt-5.4` |
| Base URL | Optionale Base URL für alternative Provider | — |
| GitHub Token | Optionaler Token für private Repos / höhere Rate Limits | — |

Alternativ kann `OPENAI_API_KEY` als Umgebungsvariable gesetzt werden — dann ist kein Key in der UI nötig.

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx                  # Hauptseite (Client Component)
│   └── api/
│       ├── analyze/route.ts      # Streaming-Analyse (Edge)
│       ├── github/issue/route.ts # GitHub Issue Fetch (Edge)
│       └── generate-ui/route.ts  # Generative UI Mockup (Edge)
├── components/
│   ├── plan-viewer.tsx           # Streaming-Anzeige des Plans
│   ├── plan-canvas.tsx           # Editierbarer Canvas
│   ├── mockup-preview.tsx        # UI-Mockup-Vorschau
│   ├── settings-panel.tsx        # Einstellungen
│   ├── editable-field.tsx        # Inline-Edit-Komponente
│   ├── risk-panel.tsx            # Risiko-Anzeige
│   └── approval-gate.tsx         # Approval-Indikator
└── lib/
    ├── types.ts                  # Shared Types
    ├── github.ts                 # GitHub URL Parsing & Validation
    ├── storage.ts                # localStorage Wrapper
    └── implementation-plan-schema.ts  # Zod Schema für den Plan
```
