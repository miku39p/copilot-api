import { z } from "zod/v4"

export const imageGenerationOutputSchema = z.object({
  result: z.string(),
})
