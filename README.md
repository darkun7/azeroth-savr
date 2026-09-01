# azeroth-savr

Stolen Realms save data editor. A client-only web app (React + Vite) that lets you upload a save file (e.g. `Character00.json`), edit it, and download the modified version. All data is processed in your browser — nothing is uploaded to a server.

## Features

- **Upload** a character save file via drag & drop or file picker
- **Tabs** for each editor section:
  - **Character** — name, level, hardcore, gender, flags
  - **Inventory** — add/edit/remove items with a searchable gear picker
  - **Fortune** — edit fortunes with a searchable picker
  - **Skills** — skill slot arrangement + raw attribute/skill values
  - **Stats** — action charges, quest nodes, quest statuses
  - **Progress** — active visuals, colors, trophies, quests
- **Download** the edited save as JSON

Gear and fortune item data is pulled from the
[stolen-realm-gearlib](https://github.com/chrifox/stolen-realm-gearlib) repository
at build time and bundled into the app.

## Requirements

- Node.js 18+ (for the build and data fetch)
- `make` (optional — you can also use the npm scripts directly on Windows)

## Makefile

| Target       | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `make install` | Install npm dependencies                                     |
| `make fetch-data` | Download the gearlib CSVs and convert them to `src/data/*.json` |
| `make dev`   | Fetch data, then start the dev server                          |
| `make build` | Fetch data, then build a production bundle to `dist/`          |
| `make preview` | Preview the production build                                 |
| `make clean` | Remove `dist/` and `src/data/`                                 |

On Windows (no `make`), use the npm scripts instead:

```bash
npm install
npm run fetch-data   # or just npm run dev / npm run build which fetch automatically
npm run dev
npm run build
```

## GitHub Pages

The built site is output to `dist/` and uses a base path of `/azeroth-savr/`
(change `base` in `vite.config.js` if you deploy under a different repo name).

To deploy:

```bash
make build
# publish the contents of dist/ to the gh-pages branch, e.g.:
npx gh-pages -d dist
```

## Project structure

```
azeroth-savr/
├── Makefile
├── scripts/fetch-data.js     # downloads + converts the gearlib CSVs
├── src/
│   ├── data/                 # GENERATED at build time (gitignored)
│   ├── utils/                # data lookups, immutable helpers, export
│   └── components/           # editor tabs and shared widgets
└── sample-data/              # example Character00.json for testing
```
