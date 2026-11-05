import { SetMetadata } from "@nestjs/common";

import type { MessageId } from "src/messages/message-ids";

export const RESPONSE_MESSAGE_KEY = "responseMessage";

/** Sets the success message ID of an endpoint. Without it, `OK` (or `CREATED` for 201) is used. */
export const ResponseMessage = (messageId: MessageId) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, messageId);
