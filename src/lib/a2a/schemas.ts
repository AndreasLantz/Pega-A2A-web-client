import { z } from "zod";

export const JsonRpcErrorObjectSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});

export const TextPartSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const FilePartSchema = z.object({
  kind: z.literal("file"),
  file: z.union([
    z.object({ mimeType: z.string(), bytes: z.string() }),
    z.object({ mimeType: z.string(), uri: z.string() }),
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const DataPartSchema = z.object({
  kind: z.literal("data"),
  data: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PartSchema = z.discriminatedUnion("kind", [
  TextPartSchema,
  FilePartSchema,
  DataPartSchema,
]);

export type TextPart = z.infer<typeof TextPartSchema>;
export type FilePart = z.infer<typeof FilePartSchema>;
export type DataPart = z.infer<typeof DataPartSchema>;
export type Part = z.infer<typeof PartSchema>;

export function isTextPart(part: Part): part is TextPart {
  return part.kind === "text";
}

export const RoleSchema = z.enum(["user", "agent"]);
export type Role = z.infer<typeof RoleSchema>;

export const MessageSchema = z.object({
  messageId: z.string(),
  role: RoleSchema,
  parts: z.array(PartSchema),
  kind: z.string().optional(),
  contextId: z.string().optional(),
  taskId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const TaskStateSchema = z.enum([
  "submitted",
  "working",
  "input-required",
  "auth-required",
  "completed",
  "failed",
  "canceled",
  "rejected",
]);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const TERMINAL_STATES = new Set<TaskState>([
  "completed",
  "failed",
  "canceled",
  "rejected",
]);

export const INTERRUPTED_STATES = new Set<TaskState>([
  "input-required",
  "auth-required",
]);

export const ArtifactSchema = z.object({
  artifactId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  parts: z.array(PartSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const TaskStatusSchema = z.object({
  state: TaskStateSchema,
  message: MessageSchema.optional(),
  timestamp: z.string().optional(),
});
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  contextId: z.string().optional(),
  status: TaskStatusSchema,
  artifacts: z.array(ArtifactSchema).optional(),
  history: z.array(MessageSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const SendResultSchema = z.union([TaskSchema, MessageSchema]);
export type SendResult = Task | Message;

export function isTask(result: SendResult): result is Task {
  return "id" in result && "status" in result;
}

export function isMessage(result: SendResult): result is Message {
  return "messageId" in result && "role" in result && !("status" in result);
}

const booleanLike = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : v),
  z.boolean(),
);

export const AgentCapabilitiesSchema = z.object({
  streaming: booleanLike.optional(),
  pushNotifications: booleanLike.optional(),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

export const AgentSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  inputModes: z.array(z.string()).optional(),
  outputModes: z.array(z.string()).optional(),
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

export const AgentCardSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  version: z.string().optional(),
  documentationUrl: z.string().optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
  skills: z.array(AgentSkillSchema).optional(),
  defaultInputModes: z.array(z.string()).optional(),
  defaultOutputModes: z.array(z.string()).optional(),
});
export type AgentCard = z.infer<typeof AgentCardSchema>;

export const MessageSendParamsSchema = z.object({
  message: MessageSchema,
  configuration: z
    .object({ acceptedOutputModes: z.array(z.string()).optional() })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type MessageSendParams = z.infer<typeof MessageSendParamsSchema>;
