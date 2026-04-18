import type { AnthropicMessagesPayload } from "./anthropic-types"

interface AnthropicToolLike {
  type?: unknown
  name?: unknown
  description?: unknown
  input_schema?: unknown
}

const ANTHROPIC_SERVER_TOOL_TYPES = new Set([
  "web_search",
  "web_search_20250305",
  "text_editor_20250124",
  "text_editor_20250429",
  "code_execution_20250522",
  "mcp",
  "computer_20250124",
])

const isServerSideTool = (tool: AnthropicToolLike): boolean =>
  typeof tool.type === "string" && ANTHROPIC_SERVER_TOOL_TYPES.has(tool.type)

const sanitizeAnthropicTool = (
  tool: AnthropicToolLike,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {}

  if (typeof tool.name === "string") {
    sanitized.name = tool.name
  }

  if (typeof tool.description === "string") {
    sanitized.description = tool.description
  }

  if (tool.input_schema && typeof tool.input_schema === "object") {
    sanitized.input_schema = tool.input_schema
  }

  return sanitized
}

export function sanitizeAnthropicPayload(
  payload: AnthropicMessagesPayload,
): void {
  // Remove unsupported fields that Copilot API rejects.
  // biome-ignore lint/performance/noDelete: cleaning up unsupported fields
  delete (payload as unknown as Record<string, unknown>).context_management

  if (!Array.isArray(payload.tools)) {
    return
  }

  payload.tools = payload.tools
    .filter((tool) => !isServerSideTool(tool as AnthropicToolLike))
    .map((tool) =>
      sanitizeAnthropicTool(tool as AnthropicToolLike),
    ) as unknown as AnthropicMessagesPayload["tools"]
}
