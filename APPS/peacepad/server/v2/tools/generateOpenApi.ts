import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodFirstPartyTypeKind, type ZodTypeAny } from "zod";
import { conflictCheckRequestSchema } from "../schemas/conflictCheck.ts";
import { v2ResponseEnvelopeSchema } from "../schemas/envelope.ts";
import { intentRouteRequestSchema } from "../schemas/intent.ts";
import { orchestrateRequestSchema } from "../schemas/orchestrate.ts";
import { rewriteMessageRequestSchema } from "../schemas/rewriteMessage.ts";
import { supportDiscoveryRequestSchema } from "../schemas/supportDiscovery.ts";

type JsonSchema = Record<string, unknown>;

function isOptionalSchema(schema: ZodTypeAny): boolean {
  const typeName = schema._def.typeName;
  if (typeName === ZodFirstPartyTypeKind.ZodOptional) {
    return true;
  }
  if (typeName === ZodFirstPartyTypeKind.ZodDefault) {
    return true;
  }
  return false;
}

function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  const typeName = schema._def.typeName;
  if (typeName === ZodFirstPartyTypeKind.ZodOptional) {
    return unwrapSchema(schema._def.innerType);
  }
  if (typeName === ZodFirstPartyTypeKind.ZodDefault) {
    return unwrapSchema(schema._def.innerType);
  }
  if (typeName === ZodFirstPartyTypeKind.ZodEffects) {
    return unwrapSchema(schema._def.schema);
  }
  return schema;
}

function convertZodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const unwrapped = unwrapSchema(schema);
  const typeName = unwrapped._def.typeName;

  if (typeName === ZodFirstPartyTypeKind.ZodObject) {
    const shape = unwrapped._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodToJsonSchema(value as ZodTypeAny);
      if (!isOptionalSchema(value as ZodTypeAny)) {
        required.push(key);
      }
    }

    const jsonSchema: JsonSchema = {
      type: "object",
      properties,
      additionalProperties: false,
    };

    if (required.length > 0) {
      jsonSchema.required = required;
    }

    return jsonSchema;
  }

  if (typeName === ZodFirstPartyTypeKind.ZodString) {
    const jsonSchema: JsonSchema = { type: "string" };
    const checks = unwrapped._def.checks ?? [];
    for (const check of checks) {
      if (check.kind === "min") {
        jsonSchema.minLength = check.value;
      }
      if (check.kind === "max") {
        jsonSchema.maxLength = check.value;
      }
      if (check.kind === "email") {
        jsonSchema.format = "email";
      }
      if (check.kind === "url") {
        jsonSchema.format = "uri";
      }
      if (check.kind === "uuid") {
        jsonSchema.format = "uuid";
      }
      if (check.kind === "datetime") {
        jsonSchema.format = "date-time";
      }
    }
    return jsonSchema;
  }

  if (typeName === ZodFirstPartyTypeKind.ZodNumber) {
    const jsonSchema: JsonSchema = { type: "number" };
    const checks = unwrapped._def.checks ?? [];
    for (const check of checks) {
      if (check.kind === "int") {
        jsonSchema.type = "integer";
      }
      if (check.kind === "min") {
        jsonSchema.minimum = check.value;
      }
      if (check.kind === "max") {
        jsonSchema.maximum = check.value;
      }
    }
    return jsonSchema;
  }

  if (typeName === ZodFirstPartyTypeKind.ZodBoolean) {
    return { type: "boolean" };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodArray) {
    const checks = unwrapped._def.exactLength
      ? [{ kind: "length", value: unwrapped._def.exactLength.value }]
      : unwrapped._def.minLength || unwrapped._def.maxLength
        ? [
            ...(unwrapped._def.minLength
              ? [{ kind: "min", value: unwrapped._def.minLength.value }]
              : []),
            ...(unwrapped._def.maxLength
              ? [{ kind: "max", value: unwrapped._def.maxLength.value }]
              : []),
          ]
        : [];

    const jsonSchema: JsonSchema = {
      type: "array",
      items: convertZodToJsonSchema(unwrapped._def.type),
    };
    for (const check of checks) {
      if (check.kind === "min") {
        jsonSchema.minItems = check.value;
      }
      if (check.kind === "max") {
        jsonSchema.maxItems = check.value;
      }
      if (check.kind === "length") {
        jsonSchema.minItems = check.value;
        jsonSchema.maxItems = check.value;
      }
    }
    return jsonSchema;
  }

  if (typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "string",
      enum: unwrapped._def.values,
    };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodNativeEnum) {
    const enumValues = Object.values(unwrapped._def.values).filter(
      (value) => typeof value === "string" || typeof value === "number",
    );
    return { enum: enumValues };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodLiteral) {
    const literalValue = unwrapped._def.value;
    if (typeof literalValue === "number") {
      return {
        type: Number.isInteger(literalValue) ? "integer" : "number",
        enum: [literalValue],
        default: literalValue,
      };
    }
    if (typeof literalValue === "string") {
      return {
        type: "string",
        enum: [literalValue],
        default: literalValue,
      };
    }
    if (typeof literalValue === "boolean") {
      return {
        type: "boolean",
        enum: [literalValue],
        default: literalValue,
      };
    }
    return { enum: [literalValue] };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodNullable) {
    const inner = convertZodToJsonSchema(unwrapped._def.innerType);
    return {
      ...inner,
      nullable: true,
    };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodUnion) {
    return {
      oneOf: unwrapped._def.options.map((option: ZodTypeAny) => convertZodToJsonSchema(option)),
    };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodDiscriminatedUnion) {
    const options = Array.from(unwrapped._def.options.values());
    return {
      oneOf: options.map((option: ZodTypeAny) => convertZodToJsonSchema(option)),
    };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodRecord) {
    return {
      type: "object",
      additionalProperties: convertZodToJsonSchema(unwrapped._def.valueType),
    };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodUnknown || typeName === ZodFirstPartyTypeKind.ZodAny) {
    return {};
  }

  if (typeName === ZodFirstPartyTypeKind.ZodNull) {
    return { type: "null" };
  }

  if (typeName === ZodFirstPartyTypeKind.ZodTuple) {
    const items = unwrapped._def.items.map((item: ZodTypeAny) => convertZodToJsonSchema(item));
    return {
      type: "array",
      items,
      minItems: items.length,
      maxItems: items.length,
    };
  }

  // Fallback for types not currently used in v2 schemas.
  return {};
}

function buildOpenApiDocument() {
  const componentsSchemas = {
    V2ResponseEnvelope: convertZodToJsonSchema(v2ResponseEnvelopeSchema),
    OrchestrateRequest: convertZodToJsonSchema(orchestrateRequestSchema),
    IntentRouteRequest: convertZodToJsonSchema(intentRouteRequestSchema),
    ConflictCheckRequest: convertZodToJsonSchema(conflictCheckRequestSchema),
    RewriteMessageRequest: convertZodToJsonSchema(rewriteMessageRequestSchema),
    SupportDiscoveryRequest: convertZodToJsonSchema(supportDiscoveryRequestSchema),
  };

  return {
    openapi: "3.0.3",
    info: {
      title: "PeacePad v2 API",
      version: "1.0.0",
      description: "OpenAPI spec generated from PeacePad v2 Zod contracts.",
    },
    servers: [
      {
        url: "https://api.peacepad.ca",
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths: {
      "/v2/conversation/orchestrate": {
        post: {
          operationId: "orchestrateConversationV2",
          summary: "Run the v2 conversation orchestrator",
          tags: ["v2"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OrchestrateRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
      "/v2/health": {
        get: {
          operationId: "getV2Health",
          summary: "Get v2 health status",
          tags: ["v2"],
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
      "/v2/router/intent": {
        post: {
          operationId: "routeIntentV2",
          summary: "Route text to the best v2 module",
          tags: ["v2"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IntentRouteRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
      "/v2/modules/conflict-check": {
        post: {
          operationId: "runConflictCheckV2",
          summary: "Run conflict analysis",
          tags: ["v2"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ConflictCheckRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
      "/v2/modules/rewrite-message": {
        post: {
          operationId: "runRewriteMessageV2",
          summary: "Rewrite a co-parenting message",
          tags: ["v2"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RewriteMessageRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
      "/v2/modules/support-discovery": {
        post: {
          operationId: "runSupportDiscoveryV2",
          summary: "Discover support resources",
          tags: ["v2"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SupportDiscoveryRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Canonical v2 envelope response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/V2ResponseEnvelope",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Use `Bearer <token>` in the Authorization header.",
        },
      },
      schemas: componentsSchemas,
    },
  };
}

function writeOpenApiFile() {
  const doc = buildOpenApiDocument();
  const thisFilePath = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(thisFilePath), "../../..");
  const outFile = resolve(repoRoot, "docs/v2/openapi.yml");
  mkdirSync(dirname(outFile), { recursive: true });

  const yamlLikeJson = `${JSON.stringify(doc, null, 2)}\n`;
  const existing = (() => {
    try {
      return readFileSync(outFile, "utf8");
    } catch {
      return "";
    }
  })();

  if (existing !== yamlLikeJson) {
    writeFileSync(outFile, yamlLikeJson, "utf8");
    console.log(`[v2:openapi] Wrote ${outFile}`);
  } else {
    console.log(`[v2:openapi] Up to date: ${outFile}`);
  }
}

writeOpenApiFile();
