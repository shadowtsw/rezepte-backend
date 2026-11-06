export interface Ingredient {
  id: string;
  name: string;
  normalizedName: string;
  /** Unit used the last time this ingredient was saved in a recipe; preselected in the editor. */
  lastUnit?: string;
}
