# Rezepte Backend

NestJS API of a private recipe app for the home network. Frontend: [rezepte-frontend](https://github.com/shadowtsw/rezepte-frontend).

## Local development

```bash
npm install
cp .env.example .env   # then fill in MONGO_URI
npm run start:dev      # http://localhost:3000
```

```bash
npm run lint:check
npm test
npm run build
```

More in [docs/](docs/) and [CLAUDE.md](CLAUDE.md).
