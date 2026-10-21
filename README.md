# Crackers

An FPV parts inventory and drone build manager by Matt Skrzypek. Track what you own, reserve components for installed builds, and check planned combinations against the specifications you supply.

Built with TypeScript, Vite, native browser forms, and Zod. This repository contains the recovered v0.1 browser-local prototype; it is not a claim that a separately hosted instance uses the same revision.

## Features

- Searchable parts inventory with unit quantities, weights, costs in CAD, notes, and photos.
- Planned and installed builds with component manifests and stock allocation.
- Voltage, prop-clearance, connector, video-family, receiver-protocol, mounting-pattern, current-headroom, and UART advisories.
- Weight and cost totals that explicitly flag missing specifications.
- Versioned JSON import/export with runtime schema validation and referential integrity checks.
- Firmware version and target metadata for Betaflight and ExpressLRS.

## Run locally

Use Node.js 22.12 or later and pnpm 11.25.0, as declared in package.json.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the loopback URL printed by Vite. Build for static hosting with `pnpm build`; deploy the generated `dist/` directory.

```sh
pnpm test
pnpm build
```

In environments that restrict the tsx CLI's IPC socket, run the same tests with `node --import tsx --test tests/workbench.test.ts`.

## Engineering decisions

The pure compatibility engine in [src/model.ts](src/model.ts) is separate from the DOM interface. Zod validates persisted and imported data, rejects dangling references and duplicate IDs, and prevents installed builds from reserving more stock than is owned. Planned builds can reuse parts as simulations.

Unknown specifications remain unknown. Motor current is supplied from measurements for the exact setup, rather than inferred from KV. Checks are planning aids and require accurate component data and manual manufacturer verification.

## Storage and privacy

Inventory lives in localStorage for the current browser and origin. Export backups before clearing browser data or moving between devices. There is no account system, cloud synchronization, or application backend in this prototype. Exported backups can include notes and photos; keep personal backups out of this repository.

The stylesheet loads fonts from Google Fonts, so loading the app can make font requests to Google. Local inventory is not sent by application code.

## Verification

The recovered source passed all five model tests and the TypeScript/Vite production build during repository preparation. Tests cover totals, stock reservations, incompatible components, missing specifications, and backup validation. Browser interaction and hardware compatibility require separate validation.

See [MVP.md](MVP.md) for the detailed data model and compatibility contract, and [tests/workbench.test.ts](tests/workbench.test.ts) for the regression cases.
