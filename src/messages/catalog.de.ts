import type { Catalog } from "./catalog";

/** German texts. Placeholders like `{id}` are filled from `data.params`. */
export const CATALOG_DE: Catalog = {
  OK: "Erledigt.",
  CREATED: "Angelegt.",
  VALIDATION_FAILED: "Die Eingaben sind nicht gültig.",
  NOT_FOUND: "Nicht gefunden.",
  CONFLICT: "Die Aktion steht im Konflikt mit dem aktuellen Stand.",
  REQUEST_FAILED: "Die Anfrage konnte nicht verarbeitet werden.",
  INTERNAL_ERROR: "Ein unerwarteter Fehler ist aufgetreten.",

  INVALID_VALUE: "Ungültiger Wert.",
  EQUALS: "Unerwarteter Wert.",
  IS_ARRAY: "Muss eine Liste sein.",
  IS_INT: "Muss eine ganze Zahl sein.",
  IS_NOT_EMPTY: "Darf nicht leer sein.",
  IS_NUMBER: "Muss eine Zahl sein.",
  IS_STRING: "Muss ein Text sein.",
  IS_UUID: "Muss eine gültige ID sein.",
  MIN: "Wert ist zu klein.",
  MIN_LENGTH: "Text ist zu kurz.",
  MAX_LENGTH: "Text ist zu lang.",
  IS_IN: "Dieser Wert ist nicht erlaubt.",
  NESTED_VALIDATION: "Ungültiger Aufbau.",

  RECIPE_NOT_FOUND: "Rezept {id} wurde nicht gefunden.",
  RECIPE_ALREADY_EXISTS: "Ein Rezept mit der ID {id} existiert bereits.",
  RECIPE_CREATED: "Rezept angelegt.",
  RECIPE_UPDATED: "Rezept gespeichert.",
  RECIPE_DELETED: "Rezept gelöscht.",
  RECIPE_PUBLISHED: "Rezept veröffentlicht.",
  RECIPE_ARCHIVED: "Rezept archiviert.",
  RECIPE_SET_TO_DRAFT: "Rezept ist wieder ein Entwurf.",

  CATEGORY_NOT_FOUND: "Kategorie {id} wurde nicht gefunden.",
  CATEGORY_ALREADY_EXISTS: "Diese Kategorie existiert bereits.",
  CATEGORY_CREATED: "Kategorie angelegt.",
  CATEGORY_UPDATED: "Kategorie gespeichert.",
  CATEGORY_DELETED: "Kategorie gelöscht.",

  INGREDIENT_NOT_FOUND: "Zutat {id} wurde nicht gefunden.",
  INGREDIENT_ALREADY_EXISTS: "Die Zutat „{name}“ existiert bereits.",
  INGREDIENT_CREATED: "Zutat angelegt.",
  INGREDIENT_UPDATED: "Zutat gespeichert.",
  INGREDIENT_DELETED: "Zutat gelöscht.",

  COLLECTION_NOT_FOUND: "Sammlung {id} wurde nicht gefunden.",
  COLLECTION_GROUP_NOT_FOUND:
    "Die Gruppe {groupId} gibt es in dieser Sammlung nicht.",
  COLLECTION_VERSION_CONFLICT:
    "Die Sammlung wurde inzwischen geändert. Bitte neu laden und erneut versuchen.",
  COLLECTION_RECIPE_NOT_PUBLISHED:
    "Nur veröffentlichte Rezepte können hinzugefügt werden.",
  COLLECTION_ITEM_IDS_NOT_UNIQUE:
    "Einträge in der Sammlung müssen eindeutige IDs haben.",
  COLLECTION_ITEM_TYPE_CHANGED:
    "Ein bestehender Eintrag kann nicht zwischen Rezept und Gruppe wechseln.",
  COLLECTION_ITEM_RECIPE_CHANGED:
    "Ein bestehender Eintrag kann nicht auf ein anderes Rezept zeigen.",
  COLLECTION_CREATED: "Sammlung angelegt.",
  COLLECTION_RENAMED: "Sammlung umbenannt.",
  COLLECTION_DELETED: "Sammlung gelöscht.",
  COLLECTION_RECIPE_ADDED: "Rezept zur Sammlung hinzugefügt.",
  COLLECTION_ITEMS_UPDATED: "Sammlung gespeichert.",

  IMPORT_MARKED_UNSURE: "Als unsicher markiert, z. B. von der KI.",
  IMPORT_RANGE: "Bereich {from}–{to}: höherer Wert übernommen.",
  IMPORT_UNKNOWN_UNIT:
    "Die Einheit „{unit}“ gibt es nicht. Bitte umrechnen oder anpassen.",
  IMPORT_SEVERAL_INGREDIENTS:
    "Mehrere Zutaten in einer Zeile? Bitte aufteilen.",
  IMPORT_NAME_MISSING: "Keine Zutat erkannt.",
  IMPORT_SIMILAR_INGREDIENT: "Ähnliche Zutat gefunden: „{name}“.",
  IMPORT_NEW_INGREDIENT: "Neue Zutat, wird angelegt.",
};
