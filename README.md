# Global Nature Watch Horizon

## Installation and Usage

The steps below will walk you through setting up your own instance of the project.

### Install Project Dependencies

To set up the development environment for this website, you'll need to install the following on your system:

- [Node](http://nodejs.org/) (see version in [.nvmrc](./.nvmrc)) (To manage multiple node versions we recommend [nvm](https://github.com/creationix/nvm))
- [pnpm](https://pnpm.io/installation)

### Initialize `.env.local` File

The project uses environment variables, which are set by default in the [.env](.env) file. To customize these variables (e.g., to use a custom database), create a `.env.local` file at the root of the repository (`cp .env.example .env.local`) and modify as needed.

**Required Environment Variables:**

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: Your Mapbox access token for map tiles

Variables are read by Vite at build time (see [Env Variables and Modes](https://vite.dev/guide/env-and-mode)). They keep the `NEXT_PUBLIC_` prefix on purpose: `vite.config.ts` sets `envPrefix: "NEXT_PUBLIC_"`, so only variables with that prefix reach the browser bundle.

Note: The `.env.local` file is configured to be ignored by Git to prevent accidental exposure of sensitive information.

### Start local development server

If you use [`nvm`](https://github.com/creationix/nvm), activate the desired Node version:

```sh
nvm install
```

Install Node modules:

```sh
pnpm install
```

Start development server:

```sh
pnpm dev
```

✨ You can now access the app at [http://localhost:3000](http://localhost:3000)

## Chart Debug Page

A hidden page at `/chart-debug` renders every chart and table widget type with representative dummy data. Use it to visually QA chart rendering, test new features, and catch regressions.

### How to enable

Add the following to your `.env.local`:

```
NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=true
```

Restart the dev server, then visit:

```
http://localhost:3000/chart-debug
```

> **Note:** When the env var is missing or set to anything other than `true`, the route isn't registered at all (the page isn't even in the bundle), so `/chart-debug` shows the 404 page.

### What's included

The debug page contains 17 fixtures covering:

- **All chart types** — bar, stacked bar, grouped bar, line, area, pie, scatter
- **Tables** — standard, large (50 rows for pagination testing), wide (8+ columns for scroll indicator testing)
- **Edge cases** — long category labels, empty data, multi-series with colorblind-safe dash patterns
- **Domain color mappings** — land cover, deforestation drivers, and generic fallback palette
- **Provenance drawer** — every fixture includes fake generation data (code, output, sources)

Use the filter buttons at the top to narrow by chart category (Bars, Line/Area, Pie, Scatter, Table, Edge cases).

### What you can test

- Tooltips and axis labels
- Column sorting and pagination on tables
- Export dropdown (CSV download, PNG save)
- Chart ↔ table view toggle
- Expand/fullscreen dialog
- "View how this was generated" provenance drawer
- Horizontal scroll fade indicators on wide tables
- Empty state rendering
- Colorblind-safe palette and stroke dash patterns on multi-series charts

## License

TBD
