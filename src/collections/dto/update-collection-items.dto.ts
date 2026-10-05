import { Type } from "class-transformer";
import { IsArray, IsInt, Min, ValidateNested } from "class-validator";

import { CollectionGroupItemDto } from "./collection-group-item.dto";
import { CollectionRecipeItemDto } from "./collection-recipe-item.dto";

export class UpdateCollectionItemsDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionRecipeItemDto, {
    discriminator: {
      property: "type",
      subTypes: [
        {
          value: CollectionRecipeItemDto,
          name: "recipe",
        },
        {
          value: CollectionGroupItemDto,
          name: "group",
        },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  items!: Array<CollectionRecipeItemDto | CollectionGroupItemDto>;
}
