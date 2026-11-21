// Live document intake: a photo of a cooperative receipt or land document -> structured fields.
// Claude vision with structured outputs (schema-valid JSON). Every field carries a confidence and
// the verbatim text it was read from. Coordinates are NEVER taken from the model: geometry only
// comes from GPS capture, a map or an import.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5-5";

export const FIELD_NAMES = [
  "farmer_name",
  "cedula",
  "farm",
  "vereda",
  "municipality",
  "date",
  "kg",
  "product",
  "receipt_number",
  "hectares",
  "tenure",
  "folio",
];

// Fields that are legally material: a person must accept them with a click (architecture §Intake).
export const MATERIAL_FIELDS = ["farmer_name", "cedula", "date", "kg", "hectares"];

const Field = z.object({
  field: z.enum(FIELD_NAMES),
  value: z.string().nullable().describe("The value exactly as written, normalised only for obvious spelling of names. Null if illegible or absent"),
  confidence: z.number().describe("0 to 1: how sure you are you read this correctly"),
  evidence: z.string().nullable().describe("The verbatim text on the document this value was read from"),
  illegible: z.boolean().describe("True if the text is there but can't be read reliably"),
});

const Extraction = z.object({
  document_type: z.enum(["purchase_receipt", "land_certificate", "cedula_cafetera", "rut", "other"]),
  language: z.string().describe("ISO 639-1 code, e.g. es"),
  fields: z.array(Field),
  transcribed_coordinates: z
    .string()
    .nullable()
    .describe("Any coordinates written on the document, copied verbatim. Never computed or inferred"),
  warnings: z.array(z.string()).describe("Anything a reviewer should know: crossings-out, unclear units, missing stamps"),
});

const SYSTEM = `You read photos of documents from Colombian coffee and cocoa cooperatives: purchase receipts (recibos de compra, facturas), land documents (certificado de tradición y libertad, escritura, sana posesión letters), the Cédula Cafetera and the RUT.
Extract only what is written. For each field you report, give the verbatim source text in "evidence".
Rules:
- If a value is illegible or absent, return null for it (or leave the field out). Never guess names, ID numbers, dates, quantities or areas.
- Copy quantities as written, including the unit (e.g. "2.100 kg", "8 @", "1 carga"). Spanish uses "." as the thousands separator.
- Dates: copy as written in "evidence"; in "value" give ISO yyyy-mm-dd only if the date is unambiguous, otherwise null.
- Never produce coordinates, plot areas or ID numbers that are not printed on the document. Coordinates go only in transcribed_coordinates, verbatim.`;

export class ExtractError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Colombian units for coffee/cocoa -> kg (shown to the reviewer with the factor used).
const UNIT_KG = [
  [/\bcargas?\b/i, 125, "1 carga = 125 kg"],
  [/\bquintal(es)?\b|\bqq\b/i, 50, "1 quintal = 50 kg"],
  [/\barrobas?\b|@/i, 12.5, "1 arroba = 12.5 kg"],
];

// "2.100 kg" -> 2100; "8 @" -> 100 (factor noted); "1.200,5 kg" -> 1200.5
export function normaliseKg(text) {
  if (text == null) return { kg: null, note: null };
  const s = String(text);
  const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/);
  if (!m) return { kg: null, note: "No number found" };
  const n = Number(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));
  for (const [re, factor, note] of UNIT_KG) if (re.test(s)) return { kg: Math.round(n * factor * 10) / 10, note };
  return { kg: n, note: /kg|kilo/i.test(s) ? null : "Unit not stated: assumed kg, check" };
}

// Deterministic post-checks on the model output (no model involved).
export function postProcess(ex) {
  const fields = [];
  for (const f of ex.fields) {
    const out = { field: f.field, value: f.value, confidence: f.confidence, source: f.evidence ?? "", illegible: f.illegible, note: null };
    if (f.illegible || f.value == null) {
      out.value = null;
      out.note = "Illegible or absent: a person must fill this in";
    }
    if (f.field === "kg" && out.value != null) {
      const { kg, note } = normaliseKg(f.value);
      out.value = kg;
      out.note = note;
    }
    if (f.field === "date" && out.value != null && !/^\d{4}-\d{2}-\d{2}$/.test(out.value)) {
      out.note = "Date not unambiguous: check against the document";
      out.value = null;
    }
    out.material = MATERIAL_FIELDS.includes(f.field);
    out.needs_check = out.material || out.value == null || (out.confidence ?? 0) < 0.85;
    fields.push(out);
  }
  fields.push({ field: "coordinates", value: null, source: "—", confidence: null, note: "Never taken from the AI: comes from GPS capture", material: false, needs_check: false });
  return {
    document_type: ex.document_type,
    language: ex.language,
    transcribed_coordinates: ex.transcribed_coordinates,
    warnings: ex.warnings,
    fields,
  };
}

let client = null;

export async function extractDocument(imageBase64, mediaType) {
  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Extraction) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Extract the fields from this document." },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new ExtractError(422, "The model declined to read this image.");
  if (response.stop_reason === "max_tokens") throw new ExtractError(422, "The output was cut off. Try a photo of a single document.");
  if (!response.parsed_output) throw new ExtractError(502, "Couldn't read structured fields from this photo. Try a clearer photo.");
  return { model: response.model, ...postProcess(response.parsed_output) };
}

export function friendlyExtractError(error) {
  if (error instanceof ExtractError) return [error.status, error.message];
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError)
    return [401, "No valid Anthropic API key on the server. Set ANTHROPIC_API_KEY and restart, or use the recorded extractions."];
  if (error instanceof Anthropic.RateLimitError) return [429, "Rate limited. Wait a few seconds and try again."];
  if (error instanceof Anthropic.APIError) return [502, `The AI service returned an error (${error.status}).`];
  // Includes "Could not resolve authentication method" when no key is configured.
  return [500, "The server couldn't call the AI service. Check ANTHROPIC_API_KEY, or use the recorded extractions."];
}
