import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";

import type { Ingredient } from "src/ingredients/ingredient.model";
import {
  findSimilarIngredient,
  normalizeIngredientName,
} from "src/ingredients/ingredient.utils";
import { IngredientsService } from "src/ingredients/ingredients.service";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import { PAGE_FETCHER, type PageFetcher } from "./imports.constants";
import type { ImportPreview, ImportPreviewLine } from "./import-preview";
import {
  parseIngredientLine,
  type ParsedIngredientLine,
} from "./parse-ingredient-line";
import { parseRecipeText, type ParsedRecipeText } from "./parse-recipe-text";
import { extractRecipeFromHtml } from "./recipe-json-ld";
import { FetchPageError, type FetchFailure } from "./safe-fetch";

/** HTTP answer per fetch failure: the link is wrong (400) or the other site failed (502). */
const FETCH_FAILURES: Record<
  FetchFailure,
  { message: MessageId; exception: new (body: object) => HttpException }
> = {
  invalid: {
    message: MESSAGE_ID.importLinkInvalid,
    exception: BadRequestException,
  },
  blocked: {
    message: MESSAGE_ID.importLinkBlocked,
    exception: BadRequestException,
  },
  unreachable: {
    message: MESSAGE_ID.importLinkUnreachable,
    exception: BadGatewayException,
  },
  "too-large": {
    message: MESSAGE_ID.importLinkTooLarge,
    exception: BadGatewayException,
  },
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly ingredientsService: IngredientsService,
    @Inject(PAGE_FETCHER) private readonly fetchPage: PageFetcher,
  ) {}

  /** Parses a pasted recipe and matches every line against the registry. Saves nothing. */
  async parseText(text: string): Promise<ImportPreview> {
    return this.withMatches(parseRecipeText(text));
  }

  /** Loads a public recipe page and reads its schema.org recipe (JSON-LD). Saves nothing. */
  async parseLink(url: string): Promise<ImportPreview> {
    const html = await this.loadPage(url);
    const recipe = extractRecipeFromHtml(html);

    if (!recipe) {
      throw new UnprocessableEntityException(
        apiError(MESSAGE_ID.importNoRecipe),
      );
    }

    return this.withMatches({
      title: recipe.title,
      servings: recipe.servings,
      source: url.trim(),
      lines: recipe.ingredients.map(parseIngredientLine),
    });
  }

  private async loadPage(url: string): Promise<string> {
    try {
      return await this.fetchPage(url);
    } catch (error) {
      if (error instanceof FetchPageError) {
        const failure = FETCH_FAILURES[error.failure];

        throw new failure.exception(apiError(failure.message));
      }

      throw error;
    }
  }

  private async withMatches(parsed: ParsedRecipeText): Promise<ImportPreview> {
    const ingredients = await this.ingredientsService.getAllIngredients();

    return {
      ...parsed,
      lines: parsed.lines.map((line) => withMatch(line, ingredients)),
    };
  }
}

/** Exact match links the line; a similar one is only suggested; otherwise a new ingredient will be created. */
function withMatch(
  line: ParsedIngredientLine,
  ingredients: Ingredient[],
): ImportPreviewLine {
  if (line.skipped || !line.name) {
    return { ...line, match: { kind: "new" } };
  }

  const normalized = normalizeIngredientName(line.name);
  const exact = ingredients.find(
    (ingredient) => ingredient.normalizedName === normalized,
  );

  if (exact) {
    return {
      ...line,
      match: { kind: "exact", ingredientId: exact.id, name: exact.name },
    };
  }

  const similar = findSimilarIngredient(ingredients, line.name);

  if (similar) {
    return {
      ...line,
      match: { kind: "similar", ingredientId: similar.id, name: similar.name },
      issues: [
        ...line.issues,
        {
          message: MESSAGE_ID.importSimilarIngredient,
          params: { name: similar.name },
        },
      ],
    };
  }

  return {
    ...line,
    match: { kind: "new" },
    issues: [...line.issues, { message: MESSAGE_ID.importNewIngredient }],
  };
}
