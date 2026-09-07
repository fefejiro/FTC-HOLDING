import crypto from "node:crypto";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export interface ValidatedResume {
  filename: string;
  mimeType: string;
  content: Buffer;
  sha256: string;
}

export function validateResumeUpload(input: {
  filename: string;
  mimeType: string;
  base64: string;
}): ValidatedResume {
  const filename = input.filename.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!filename || filename.length > 180) throw new Error("Resume filename is invalid.");
  if (!MIME_TYPES.has(mimeType)) throw new Error("Resume must be a PDF or DOCX file.");
  if (!/\.pdf$/i.test(filename) && !/\.docx$/i.test(filename)) throw new Error("Resume extension must be .pdf or .docx.");
  const content = Buffer.from(input.base64, "base64");
  if (!content.length || content.length > MAX_RESUME_BYTES) throw new Error("Resume must be between 1 byte and 5 MB.");
  const isPdf = content.subarray(0, 5).toString("ascii") === "%PDF-";
  const isDocx = content[0] === 0x50 && content[1] === 0x4b;
  if (mimeType === "application/pdf" && !isPdf) throw new Error("File content does not match a PDF.");
  if (mimeType.includes("wordprocessingml") && !isDocx) throw new Error("File content does not match a DOCX.");
  return {
    filename,
    mimeType,
    content,
    sha256: crypto.createHash("sha256").update(content).digest("hex")
  };
}
