# Crackers MVP

Crackers is a personal FPV workbench for tracking owned parts and planning quad builds. The initial release stores data in the current browser and exports complete versioned JSON backups. It has no automatic inventory import or cloud sync. Example data is optional and illustrative.

## Stack and operation

TypeScript with strict checks, Vite, native DOM/forms, Zod runtime validation, and localStorage. This keeps deployment static and the compatibility engine pure. Photos are embedded in records, limited to one 500 KB image per part or build. Browser quota failures stop the save and leave the previous workspace intact. A later multi-device release can move the same model to SQLite and object storage behind authenticated API endpoints.

Run `pnpm install`, `pnpm dev`, `pnpm test`, and `pnpm build`. The production output is `dist/`; serve it over HTTP. Dependencies and their lockfile are project-local. No environment secrets are required.

## Pages

- Overview: owned/spare counts, known inventory value, build summaries, advisories.
- Parts inventory: searchable category-filtered inventory, add/edit/delete, notes and photos.
- Drone builds: manifest assignments, quantities, UARTs, status, weight/cost totals, compatibility and firmware metadata.
- Data & backup: validated JSON import/export, optional example workspace and clear action.

## Data model

The authoritative schemas and validation live in `src/model.ts`.

- Part: ID, name, category, individual unit quantity, unit weight in grams, unit cost in CAD, notes, photo; max frame prop diameter, motor KV, supported cell range, continuous ESC current per channel, measured motor current for the exact prop/voltage setup, prop diameter, battery connector, video system, FC receiver protocol, UART count and mounting patterns.
- Build: ID, name, planned/installed status, selected cell count, connector, video system, FC receiver protocol, Betaflight version/target, ELRS version/target/domain, notes and photo.
- Build assignment: part ID, positive individual-unit quantity, optional physical UART number. Each part appears once per manifest.
- Workspace: schema version 1, parts, builds. Installed assignments cannot exceed owned quantity. Planned assignments are reusable simulations; availability is checked against other installed builds. Deleting a build releases its assignments; deleting an assigned part is prohibited.

Totals multiply unit weight/cost by assigned quantity, including the assigned battery. Unknown values are counted separately rather than treated as complete totals. Tax, shipping, wiring and unlisted hardware are excluded.

## Compatibility contract

Checks return pass, warning, error or unknown with an explanation. These are planning checks, not flight certification.

- Cell count against supplied component limits; motor KV recorded with a manual manufacturer verification advisory.
- Prop diameter against maximum frame prop diameter; exact supplied stack and motor mounting patterns.
- Connector, camera/VTX video family and FC receiver protocol against the selected build settings. CRSF is the serial protocol for a typical ELRS receiver; SPI ELRS is represented separately.
- Measured motor maximum current against continuous per-channel ESC rating. Above the rating is an error; within 20% of the limit is a planning warning. No current is inferred from KV or prop size.
- Exclusive UART assignments against the FC UART count; missing serial receiver/digital VTX assignments are unknown. Protocol-specific port-sharing exceptions, regulator output, receiver frequency/domain binding, antenna connectors and precise digital hardware-generation compatibility require manual verification in this release.
- Missing essential components, stock availability and typical four-motor/four-prop quantities. Integrated ESCs are represented by the ESC rating on the FC record.

Manufacturer ratings and test conditions are user-supplied; accurate data is required for meaningful checks. Automatic firmware flashing, firmware version compatibility, crash history, purchasing integrations, authentication and multi-user sync are outside this MVP.
