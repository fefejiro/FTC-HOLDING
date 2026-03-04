import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

type OpenApiDoc = {
  paths?: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
};

function loadOpenApiDoc(): OpenApiDoc {
  const docPath = resolve(process.cwd(), "docs/v2/openapi.yml");
  const content = readFileSync(docPath, "utf8");
  return yaml.load(content) as OpenApiDoc;
}

function resolveSchemaRef(doc: OpenApiDoc, schemaOrRef: any): any {
  if (!schemaOrRef?.$ref) {
    return schemaOrRef;
  }
  const ref = String(schemaOrRef.$ref);
  if (!ref.startsWith("#/components/schemas/")) {
    throw new Error(`Unsupported schema ref: ${ref}`);
  }
  const schemaName = ref.replace("#/components/schemas/", "");
  const schema = doc.components?.schemas?.[schemaName];
  if (!schema) {
    throw new Error(`Missing schema for ref: ${ref}`);
  }
  return schema;
}

describe("v2 openapi contract", () => {
  it("includes orchestrate request schema with required fields", () => {
    const doc = loadOpenApiDoc();
    const requestRef =
      doc.paths?.["/v2/conversation/orchestrate"]?.post?.requestBody?.content?.["application/json"]
        ?.schema;
    expect(requestRef).toBeTruthy();

    const requestSchema = resolveSchemaRef(doc, requestRef);
    expect(Array.isArray(requestSchema.required)).toBe(true);
    expect(requestSchema.required).toContain("sessionId");
    expect(requestSchema.required).toContain("mode");
    expect(requestSchema.required).toContain("message");
  });

  it("references canonical envelope schema with required top-level keys", () => {
    const doc = loadOpenApiDoc();
    const responseSchemaRef =
      doc.paths?.["/v2/conversation/orchestrate"]?.post?.responses?.["200"]?.content?.[
        "application/json"
      ]?.schema;
    expect(responseSchemaRef).toBeTruthy();

    const envelopeSchema = resolveSchemaRef(doc, responseSchemaRef);
    const required = envelopeSchema.required ?? [];
    const expectedKeys = [
      "session",
      "intent",
      "ui",
      "analysis",
      "actions",
      "explain",
      "safety",
      "errors",
    ];

    for (const key of expectedKeys) {
      expect(required).toContain(key);
    }
  });

  it("defines ui.version as integer", () => {
    const doc = loadOpenApiDoc();
    const envelopeSchema = doc.components?.schemas?.V2ResponseEnvelope;
    expect(envelopeSchema).toBeTruthy();

    const uiSchema = envelopeSchema.properties?.ui;
    expect(uiSchema).toBeTruthy();
    expect(uiSchema.properties?.version?.type).toBe("integer");
  });
});
