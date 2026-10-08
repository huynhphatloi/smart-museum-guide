# Contributing

Thanks for helping improve Smart Museum Guide. Bug reports, documentation fixes, translations and code are all welcome.

## Reporting issues

Open a GitHub issue with:

- what you expected and what happened;
- which project is affected (`backend/api`, `backend/admin`, `visitor-mobile`, `visitor-web` or `ai-services`);
- steps to reproduce, and for BLE problems the phone model, OS version and beacon type.

Please do not post credentials, `.env` files or visitor data in issues.

## Development setup

Follow [Getting started](README.md#getting-started) in the README. Each project is installed and checked on its own; there is no root workspace.

For mobile work without beacons, keep `EXPO_PUBLIC_BLE_SIMULATION=true`. For the AI service, `MOCK_MODELS=1` runs the full pipeline without a GPU.

## Making a change

1. Fork the repository and create a branch from `main`, for example `fix/qr-retry` or `feat/offline-cache`.
2. Keep each pull request focused on one change.
3. Add or update tests for logic you change (see below).
4. Run the checks for every project you touched:

   | Project | Commands |
   | --- | --- |
   | `backend/` | `npm run lint && npm run typecheck && npm test && npm run build` |
   | `visitor-mobile/` | `npm run lint && npm run typecheck && npm test` |
   | `visitor-web/` | `npm run lint && npm run typecheck && npm run build` |
   | `ai-services/` | `uv run --python 3.12 --with-requirements requirements-dev.txt python -m pytest` |

5. Open a pull request that explains what changed and why, and how you tested it. Include screenshots for UI changes.

## Conventions

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, optionally with a scope such as `feat(admin): ...`.

**Code style.** TypeScript runs in strict mode. Prettier (single quotes, trailing commas, 100 columns) and ESLint are configured per project, and lint must pass with zero warnings. Run `npm run format` in a project to format it.

**Structure.** The visitor apps are organized by feature (`src/features/<feature>/{api,model,ui}`). Put domain logic in `model/` as plain TypeScript so it can be unit tested without React Native or a browser. Tests live next to the code as `*.spec.ts`.

**Interface text** goes through the i18n dictionaries, never as literals in components. Every key needs at least Vietnamese and English.

**Database changes** need a Prisma migration. From `backend/api/`, run `npx prisma migrate dev --name <short_description>` and commit the generated SQL together with the schema change.

**AI service.** `ai-services/museum_ai/` is the source of truth. After editing it, regenerate the Colab notebook with `python scripts/build_notebook.py` and commit both.

**Privacy.** Raw BLE readings and visitor movement must stay on the device. Do not add analytics or uploads of signal data without discussing it in an issue first.

**Demo content.** New sample images or texts must be openly licensed (CC0, public domain or compatible). Add the source and license to the [Demo content](README.md#demo-content) table in the README.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
