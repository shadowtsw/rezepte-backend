# Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| – | Native `mongodb` driver, no Mongoose | full control, repository abstraction instead of ODM |
| – | Status changes only via `/publish`, `/archive`, `/draft` | PATCH must not change status |
| 2026-10-05 | Duplicate recipes in a collection are allowed | same recipe can be a single item and part of a group; items are addressed by their own ID |
| 2026-11-05 | Deploy only from `main`; lint and tests run in the Docker build | pushes to other branches deployed before; broken code could replace the running container |
| 2026-11-05 | Removed unused `mongoose` / `@nestjs/mongoose` | not used anywhere |
| 2026-11-05 | PUT and PATCH on recipes behave the same (partial `$set`) | frontend always sends the full recipe; simpler than separate logic |
| 2026-11-05 | Ingredient usages have their own `id`; validation uses `whitelist` | stable references for reordering, duplicates and the cooking checklist; PATCH could change `status` before |
| 2026-11-05 | Modular monolith with in-process events (`@nestjs/event-emitter` 3.x), no microservices | avoids circular module imports without network, broker and split data; v12 is ESM-only and breaks Jest |
| 2026-11-05 | Groups stay when their last recipe is removed (also on recipe deletion) | a group is an independent unit that can be refilled |
| 2026-11-05 | Message-response concept: `{ message, error, data }`, `message` is a catalog ID | uniform responses, translatable and machine-readable errors; see guidelines `general/api-design.md` |
| 2026-11-05 | Action endpoints answer `200`, deletes `200` with `data: null` | native status semantics; `204` cannot carry the envelope |
| 2026-11-06 | Open recipe to-dos block publishing in the service, not only in the editor | the block holds for every client (second device, API calls) |
| 2026-11-06 | Unique category names are checked in the service, not by a unique index | existing documents would need a backfilled normalized field first; with two users a race is not a real risk |
