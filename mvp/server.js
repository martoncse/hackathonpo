// CatatSekali MVP server.
// Serves the static page and one API route: POST /api/extract, which sends a
// register photo to Claude and returns structured visit records.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const PORT = Number(process.env.PORT) || 5173;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const Visit = z.object({
  row: z.number().int().describe("Row number as written in the register (1, 2, 3...)"),
  date: z.string().nullable().describe("Visit date as written, e.g. 03/11"),
  name: z.string().nullable(),
  bpjs_card_number: z
    .string()
    .nullable()
    .describe("BPJS / JKN card number exactly as written (13 digits). Null if blank or unreadable"),
  nik: z.string().nullable().describe("16-digit national ID number (NIK) if written. Null otherwise"),
  sex: z.enum(["M", "F"]).nullable().describe("L = laki-laki = M, P = perempuan = F. Null if blank or unreadable"),
  age_years: z
    .number()
    .nullable()
    .describe("Age in years. Convert months to years (4 bln = 0.33). Null if blank or unreadable"),
  village: z.string().nullable(),
  visit_type: z.enum(["sick", "immunisation", "antenatal"]),
  diagnosis: z
    .enum(["diarrhoea", "ari", "fever", "hypertension", "skin", "other"])
    .nullable()
    .describe("Only for sick visits. ISPA = ari. Diare = diarrhoea. Demam = fever"),
  vaccine: z
    .enum(["BCG", "polio", "DPT-HB-Hib", "measles_rubella", "other"])
    .nullable()
    .describe("Only for immunisation visits. MR or campak = measles_rubella"),
  anc_visit_number: z.number().int().nullable().describe("Only for antenatal visits (K1 = 1, K4 = 4)"),
  uncertain_fields: z
    .array(z.string())
    .describe("Names of fields that were hard to read or that you had to guess. Empty if none"),
});

const Extraction = z.object({
  visits: z.array(Visit),
});

const SYSTEM_PROMPT = `You read photos of daily patient registers from Indonesian community health centres (puskesmas).
Extract every visit row into a structured record. Copy what is written; do not invent values.
If a cell is blank, crossed out or unreadable, return null for that field and list the field name in uncertain_fields.
Never fill a blank age, sex, card number or NIK from the name or from context: blanks must stay null so the nurse can check them.
Copy card numbers and NIKs digit by digit; if any digit is unclear, return null and list the field in uncertain_fields.`;

const client = new Anthropic();

async function extractVisits(imageBase64, mediaType) {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      // Low effort keeps a live extraction fast enough for a stage demo.
      effort: "low",
      format: betaZodOutputFormat(Extraction),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Extract every visit in this register page." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new UserFacingError(422, "The model declined to read this image. Try another photo.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new UserFacingError(422, "The page has too many rows to read in one go. Try a photo of half the page.");
  }
  if (!response.parsed_output) {
    throw new UserFacingError(502, "Could not read structured visits from this photo. Try a clearer photo.");
  }
  return response.parsed_output.visits;
}

class UserFacingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new UserFacingError(413, "Image too large. Use a smaller photo.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new UserFacingError(400, "Request body is not valid JSON.");
  }
}

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function handleExtract(req, res) {
  try {
    const { imageBase64, mediaType } = await readJsonBody(req);
    if (typeof imageBase64 !== "string" || !imageBase64) {
      throw new UserFacingError(400, "No image was sent.");
    }
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      throw new UserFacingError(400, "Use a JPEG, PNG, WebP or GIF image.");
    }
    const visits = await extractVisits(imageBase64, mediaType);
    sendJson(res, 200, { visits });
  } catch (error) {
    if (error instanceof UserFacingError) {
      sendJson(res, error.status, { error: error.message });
    } else if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      sendJson(res, 401, { error: "No valid Anthropic API key on the server. Set ANTHROPIC_API_KEY, or use demo mode." });
    } else if (error instanceof Anthropic.RateLimitError) {
      sendJson(res, 429, { error: "Rate limited. Wait a few seconds and try again." });
    } else if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      sendJson(res, 502, { error: `The AI service returned an error (${error.status}).` });
    } else if (error instanceof Anthropic.AnthropicError) {
      // Raised before any request is sent, e.g. when no credentials are configured.
      console.error("Anthropic client error", error.message);
      sendJson(res, 401, { error: "No Anthropic API key on the server. Set ANTHROPIC_API_KEY, or use demo mode." });
    } else {
      // Includes the SDK's "Could not resolve authentication method" when no key is configured.
      console.error(error);
      sendJson(res, 500, {
        error: "The server couldn't call the AI service. Check that ANTHROPIC_API_KEY is set, or use demo mode.",
      });
    }
  }
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/extract") {
    handleExtract(req, res);
  } else if (req.method === "GET") {
    serveStatic(req, res);
  } else {
    res.writeHead(405).end("Method not allowed");
  }
});

server.listen(PORT, () => {
  console.log(`CatatSekali MVP running at http://localhost:${PORT}`);
});
