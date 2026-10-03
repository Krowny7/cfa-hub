// One-off upload: FSA full-course deck PDF + narrated audio to the
// "courses" storage bucket (private, signed URLs — same pattern as
// "fiches"). Source files live outside the repo — pass their paths as
// argv so no machine/session-specific path ever gets hardcoded here (a
// prior version embedded a literal scratchpad path and broke Tailwind's
// content scanner: see cfa-hub-vault-concept-sheet-pdf memory).
// Usage: node scripts/upload-course-fsa.mjs <pdfPath> <audioPath>
import { readFileSync } from "node:fs";
import { supabase } from "./lib/seed-core.mjs";

const [, , pdfPath, audioPath] = process.argv;
if (!pdfPath || !audioPath) {
  console.error("Usage: node scripts/upload-course-fsa.mjs <pdfPath> <audioPath>");
  process.exit(1);
}

const pdfBuf = readFileSync(pdfPath);
const { error: e1 } = await supabase.storage
  .from("courses")
  .upload("financial-statement-analysis.pdf", pdfBuf, { contentType: "application/pdf", upsert: true });
if (e1) throw e1;
console.log("PDF uploaded,", pdfBuf.length, "bytes");

const audioBuf = readFileSync(audioPath);
const { error: e2 } = await supabase.storage
  .from("courses")
  .upload("financial-statement-analysis.mp3", audioBuf, { contentType: "audio/mpeg", upsert: true });
if (e2) throw e2;
console.log("Audio uploaded,", audioBuf.length, "bytes");
