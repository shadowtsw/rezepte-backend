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
