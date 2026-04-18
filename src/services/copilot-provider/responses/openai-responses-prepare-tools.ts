/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-unnecessary-condition */
import {
  type LanguageModelV2CallOptions,
  type LanguageModelV2CallWarning,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider"

import type {
  OpenAIResponsesFileSearchToolComparisonFilter,
  OpenAIResponsesFileSearchToolCompoundFilter,
  OpenAIResponsesTool,
} from "./openai-responses-api-types"

export function prepareResponsesTools({
  tools,
  toolChoice,
  strictJsonSchema,
}: {
  tools: LanguageModelV2CallOptions["tools"]
  toolChoice?: LanguageModelV2CallOptions["toolChoice"]
  strictJsonSchema: boolean
}): {
  tools?: Array<OpenAIResponsesTool>
  toolChoice?:
    | "auto"
    | "none"
    | "required"
    | { type: "file_search" }
    | { type: "function"; name: string }
    | { type: "code_interpreter" }
    | { type: "image_generation" }
  toolWarnings: Array<LanguageModelV2CallWarning>
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  const normalizedTools = tools?.length ? tools : undefined

  const toolWarnings: Array<LanguageModelV2CallWarning> = []

  if (normalizedTools === null || normalizedTools === undefined) {
    return { tools: undefined, toolChoice: undefined, toolWarnings }
  }

  const openaiTools: Array<OpenAIResponsesTool> = []

  for (const tool of normalizedTools) {
    switch (tool.type) {
      case "function": {
        openaiTools.push({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: strictJsonSchema,
        })
        break
      }
      case "provider-defined": {
        const args = tool.args
        switch (tool.id) {
          case "openai.file_search": {
            const ranking = args.ranking as
              | { ranker?: string; scoreThreshold?: number }
              | undefined
            openaiTools.push({
              type: "file_search",
              vector_store_ids: args.vectorStoreIds as Array<string>,
              max_num_results: args.maxNumResults as number | undefined,
              ranking_options:
                ranking ?
                  {
                    ranker: ranking.ranker,
                    score_threshold: ranking.scoreThreshold,
                  }
                : undefined,
              filters: args.filters as
                | OpenAIResponsesFileSearchToolComparisonFilter
                | OpenAIResponsesFileSearchToolCompoundFilter
                | undefined,
            })

            break
          }
          case "openai.local_shell": {
            openaiTools.push({
              type: "local_shell",
            })
            break
          }
          case "openai.code_interpreter": {
            openaiTools.push({
              type: "code_interpreter",
              container: getCodeInterpreterContainer(args.container),
            })
            break
          }
          case "openai.image_generation": {
            const inputImageMask = args.inputImageMask as
              | { fileId?: string; imageUrl?: string }
              | undefined
            openaiTools.push({
              type: "image_generation",
              background: args.background as
                | "auto"
                | "opaque"
                | "transparent"
                | undefined,
              input_fidelity: args.inputFidelity as "low" | "high" | undefined,
              input_image_mask:
                inputImageMask ?
                  {
                    file_id: inputImageMask.fileId,
                    image_url: inputImageMask.imageUrl,
                  }
                : undefined,
              model: args.model as string | undefined,
              moderation: args.moderation as "auto" | undefined,
              partial_images: args.partialImages as number | undefined,
              quality: args.quality as
                | "auto"
                | "low"
                | "medium"
                | "high"
                | undefined,
              output_compression: args.outputCompression as number | undefined,
              output_format: args.outputFormat as
                | "png"
                | "jpeg"
                | "webp"
                | undefined,
              size: args.size as
                | "auto"
                | "1024x1024"
                | "1024x1536"
                | "1536x1024"
                | undefined,
            })
            break
          }
          default: {
            toolWarnings.push({ type: "unsupported-tool", tool })
            break
          }
        }
        break
      }
      default: {
        toolWarnings.push({ type: "unsupported-tool", tool })
        break
      }
    }
  }

  if (toolChoice === null || toolChoice === undefined) {
    return { tools: openaiTools, toolChoice: undefined, toolWarnings }
  }

  const type = toolChoice.type

  switch (type) {
    case "auto":
    case "none":
    case "required": {
      return { tools: openaiTools, toolChoice: type, toolWarnings }
    }
    case "tool": {
      const builtInToolChoice = getBuiltInToolChoice(toolChoice.toolName)

      return {
        tools: openaiTools,
        toolChoice: builtInToolChoice ?? {
          type: "function",
          name: toolChoice.toolName,
        },
        toolWarnings,
      }
    }
    default: {
      const _exhaustiveCheck: never = type
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${String(_exhaustiveCheck)}`,
      })
    }
  }
}

function getCodeInterpreterContainer(
  container: unknown,
): Extract<OpenAIResponsesTool, { type: "code_interpreter" }>["container"] {
  if (container === null || container === undefined) {
    return { type: "auto", file_ids: undefined }
  }

  if (typeof container === "string") {
    return container
  }

  const obj = container as { fileIds?: Array<string> }
  return { type: "auto", file_ids: obj.fileIds }
}

function getBuiltInToolChoice(
  toolName: string,
):
  | { type: "file_search" }
  | { type: "code_interpreter" }
  | { type: "image_generation" }
  | undefined {
  switch (toolName) {
    case "code_interpreter": {
      return { type: "code_interpreter" }
    }
    case "file_search": {
      return { type: "file_search" }
    }
    case "image_generation": {
      return { type: "image_generation" }
    }
    default: {
      return undefined
    }
  }
}
