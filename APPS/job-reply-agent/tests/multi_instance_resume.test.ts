import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

describe("multi-instance resume isolation", () => {
  it("generates Chukwuma content in an isolated process without Fejiro identity", async () => {
    const outputDir = path.resolve(".local", "generated-tests", "chukwuma");
    fs.mkdirSync(outputDir, { recursive: true });
    const script = [
      "import { tailorResumeForJD } from './src/resume_tailor.ts';",
      "(async()=>{",
      "const result=await tailorResumeForJD({",
      "parsed:{roleTitle:'Digital Transformation Program Manager',cleanRoleTitle:'Digital Transformation Program Manager',company:'Example Global'},",
      "jdText:'Digital transformation, product roadmaps, stakeholder communications, AI adoption, and project delivery.',",
      `templatePath:${JSON.stringify(path.resolve("instances", "chukwuma", "resumes", "Chukwuma Mezie-Okoye Golden Template.docx"))},`,
      `outputDir:${JSON.stringify(outputDir)}`,
      "});",
      "console.log('RESULT_JSON='+JSON.stringify(result));",
      "})()"
    ].join("");
    const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
    const result = spawnSync(
      process.execPath,
      [tsxCli, "-e", script],
      {
        cwd: path.resolve("."),
        env: { ...process.env, JOB_AGENT_INSTANCE_ID: "chukwuma" },
        encoding: "utf8",
        timeout: 60_000
      }
    );
    expect(result.status, `${result.error || ""}\n${result.stderr}`).toBe(0);
    const resultLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("RESULT_JSON="));
    expect(resultLine).toBeTruthy();
    const generated = JSON.parse(String(resultLine).slice("RESULT_JSON=".length)) as {
      docxPath: string;
      subtitle: string;
    };
    expect(generated.subtitle).toBe("Digital Transformation | Product Development | Project Delivery | Growth");
    expect(path.basename(generated.docxPath)).toContain("Chukwuma Mezie-Okoye");
    expect(path.basename(generated.docxPath)).not.toContain("Fejiro");

    const zip = await JSZip.loadAsync(fs.readFileSync(generated.docxPath));
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toContain("Chukwuma Mezie-Okoye");
    expect(xml).not.toMatch(/Fejiro Efiuvwere|fejiro\.efiuvwere@gmail\.com|Una Labs assets/i);
  }, 70_000);
});
