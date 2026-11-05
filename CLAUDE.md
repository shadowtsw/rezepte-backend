# Rezepte Backend

NestJS API for the private recipe app. Frontend: [rezepte-frontend](https://github.com/shadowtsw/rezepte-frontend).

## Guidelines

Follow [personal-code-guidelines](https://github.com/shadowtsw/personal-code-guidelines)
(local checkout: `D:\Projects\Guidelines`):

- `general/*.md`: coding, git, API design, collaboration
- `stacks/nestjs.md`
- `projects/rezepte.md`: domain rules (read before changing recipes or collections)

## Wiki

Read before researching the code; update when something changes.

- [docs/architecture.md](docs/architecture.md): modules, layers, database
- [docs/api.md](docs/api.md): endpoints
- [docs/setup.md](docs/setup.md): local dev, CI, deployment
- [docs/decisions.md](docs/decisions.md): decision log

## Commands

```bash
npm run start:dev    # local dev server on :3000 (uses MONGO_URI from .env)
npm run lint:check   # lint without fixing (same as CI)
npm test             # unit tests
npm run build
```
