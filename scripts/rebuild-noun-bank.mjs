import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const embeddingsDir = path.join(dataDir, "embeddings");
const chunkWords = 800;
const scale = 127;
const dimensions = 384;

function readJsonAssignment(filePath, prefix) {
  const text = fs.readFileSync(filePath, "utf8");
  const start = text.indexOf(prefix);
  if (start === -1) throw new Error(`Missing assignment in ${filePath}`);
  return JSON.parse(text.slice(start + prefix.length).replace(/;\s*$/, ""));
}

function readBase64Assignment(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/=\s*"([^"]+)";?\s*$/s);
  if (!match) throw new Error(`Missing base64 payload in ${filePath}`);
  return match[1];
}

function decodeChunk(base64) {
  const buffer = Buffer.from(base64, "base64");
  return new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function encodeChunk(bytes) {
  const unsigned = Uint8Array.from(bytes, (value) => (value < 0 ? value + 256 : value));
  return Buffer.from(unsigned).toString("base64");
}

function normalizeVector(vector) {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
}

function vectorToBytes(vector) {
  const normalized = normalizeVector(vector);
  return Int8Array.from(normalized, (value) => {
    const scaled = Math.round(value * scale);
    return Math.max(-127, Math.min(127, scaled));
  });
}

function buildModernVectors() {
  const manifest = readJsonAssignment(
    path.join(embeddingsDir, "manifest.js"),
    "window.MULTI_CONTEXTO_EMBEDDINGS_MANIFEST = "
  );
  const chunks = [];
  for (let index = 0; index < manifest.chunks; index += 1) {
    const part = String(index + 1).padStart(2, "0");
    chunks.push(
      decodeChunk(readBase64Assignment(path.join(embeddingsDir, `chunk-${part}.js`)))
    );
  }

  const bytes = new Int8Array(manifest.words.length * manifest.dimensions);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  const vectors = new Map();
  for (let index = 0; index < manifest.words.length; index += 1) {
    const word = manifest.words[index];
    const start = index * manifest.dimensions;
    const vector = new Array(manifest.dimensions);
    for (let dim = 0; dim < manifest.dimensions; dim += 1) {
      vector[dim] = bytes[start + dim] / manifest.scale;
    }
    vectors.set(word, vector);
  }
  return vectors;
}

function buildLegacyVectors() {
  const payload = readJsonAssignment(
    path.join(dataDir, "embeddings.js"),
    "window.MULTI_CONTEXTO_EMBEDDINGS = "
  );
  const vectors = new Map();
  for (const [word, vector] of Object.entries(payload.embeddings || payload)) {
    vectors.set(word, vector);
  }
  return vectors;
}

const denyWords = new Set([
  "abraham",
  "adam",
  "adams",
  "alex",
  "alexander",
  "ali",
  "amanda",
  "andrea",
  "andreas",
  "andres",
  "andrew",
  "andrews",
  "anthony",
  "arthur",
  "barack",
  "ben",
  "billy",
  "bob",
  "brian",
  "bruce",
  "charles",
  "christian",
  "christopher",
  "david",
  "donald",
  "edward",
  "elizabeth",
  "frank",
  "george",
  "harry",
  "henry",
  "isabella",
  "jacob",
  "james",
  "jane",
  "john",
  "jordan",
  "josh",
  "joshua",
  "julia",
  "karen",
  "kate",
  "katherine",
  "kevin",
  "laura",
  "linda",
  "lisa",
  "maria",
  "michael",
  "mike",
  "nancy",
  "nicole",
  "paul",
  "patrick",
  "peter",
  "rachel",
  "richard",
  "robert",
  "sarah",
  "simon",
  "steve",
  "steven",
  "susan",
  "thomas",
  "victor",
  "william",
  "williams",
  "afghan",
  "afghans",
  "african",
  "africans",
  "american",
  "americans",
  "arab",
  "arabs",
  "asian",
  "asians",
  "australian",
  "australians",
  "austrian",
  "austrians",
  "belgian",
  "belgians",
  "brazilian",
  "brazilians",
  "brit",
  "brits",
  "british",
  "bulgarian",
  "bulgarians",
  "canadian",
  "canadians",
  "dutch",
  "english",
  "european",
  "europeans",
  "french",
  "german",
  "germans",
  "greek",
  "greeks",
  "hispanic",
  "hungarian",
  "indian",
  "indians",
  "irish",
  "italian",
  "japanese",
  "korean",
  "mexican",
  "norwegian",
  "polish",
  "russian",
  "scottish",
  "spanish",
  "swedish",
  "swiss",
  "turkish",
  "ukrainian",
  "vietnamese",
  "welsh",
  "america",
  "africa",
  "asia",
  "bengal",
  "london",
  "paris",
  "rome",
  "texas",
  "york",
  "washington",
  "friday",
  "monday",
  "saturday",
  "sunday",
  "tuesday",
  "wednesday",
  "thursday",
  "today",
  "tomorrow",
  "yesterday",
  "ass",
  "asses",
  "asshole",
  "bastard",
  "bitch",
  "blowjob",
  "blowjobs",
  "boi",
  "bois",
  "boob",
  "boobs",
  "brat",
  "brats",
  "bro",
  "bros",
  "dick",
  "dicks",
  "fuck",
  "fucked",
  "fucking",
  "fucks",
  "pussy",
  "shit",
  "shits",
  "tit",
  "tits",
  "whore",
  "whores",
  "babe",
  "babes",
  "dude",
  "lad",
  "lass",
  "weirdo",
  "weirdos",
  "activist",
  "anarchist",
  "atheist",
  "baptist",
  "buddhist",
  "capitalist",
  "communist",
  "fascist",
  "methodist",
  "unionist",
  "zionist",
]);

function singularCandidates(word) {
  const candidates = [];
  if (word.endsWith("ies") && word.length > 3) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 2) {
    candidates.push(word.slice(0, -2));
    if (/(ches|shes|sses|xes|zes|oes)$/i.test(word)) candidates.push(word.slice(0, -1));
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 1) candidates.push(word.slice(0, -1));
  return [...new Set(candidates)];
}

function shouldKeep(word) {
  if (!/^[a-z][a-z-]*$/.test(word)) return false;
  if (denyWords.has(word)) return false;
  return !singularCandidates(word).some((candidate) => denyWords.has(candidate));
}

const modernVectors = buildModernVectors();
const legacyVectors = buildLegacyVectors();
const allWords = [...new Set([...modernVectors.keys(), ...legacyVectors.keys()])].filter(shouldKeep);
allWords.sort((a, b) => a.localeCompare(b));

const entries = allWords.map((word) => {
  const vector = modernVectors.get(word) || legacyVectors.get(word);
  if (!vector) throw new Error(`Missing vector for ${word}`);
  return [word, vectorToBytes(vector)];
});

const chunks = [];
for (let index = 0; index < entries.length; index += chunkWords) {
  const slice = entries.slice(index, index + chunkWords);
  const bytes = new Int8Array(slice.length * dimensions);
  let offset = 0;
  for (const [, vectorBytes] of slice) {
    bytes.set(vectorBytes, offset);
    offset += vectorBytes.length;
  }
  chunks.push(encodeChunk(bytes));
}

const manifest = {
  version: 2,
  model: "Xenova/all-MiniLM-L6-v2",
  dimensions,
  scale,
  generatedAt: new Date().toISOString(),
  source: "merged modern packed noun bank + legacy common noun bank; filtered for common nouns/objects and obvious proper names/slang",
  wordCount: entries.length,
  chunkWords,
  words: entries.map(([word]) => word),
  chunks: chunks.length,
};

const manifestPath = path.join(embeddingsDir, "manifest.js");
fs.writeFileSync(
  manifestPath,
  `window.MULTI_CONTEXTO_EMBEDDINGS_MANIFEST = ${JSON.stringify(manifest)};`
);

for (let index = 0; index < chunks.length; index += 1) {
  const part = String(index + 1).padStart(2, "0");
  const chunkPath = path.join(embeddingsDir, `chunk-${part}.js`);
  const file = [
    "window.MULTI_CONTEXTO_EMBEDDING_CHUNKS = window.MULTI_CONTEXTO_EMBEDDING_CHUNKS || [];",
    `window.MULTI_CONTEXTO_EMBEDDING_CHUNKS[${index}] = "${chunks[index]}";`,
  ].join("\n");
  fs.writeFileSync(chunkPath, file);
}

for (let index = chunks.length + 1; index <= 12; index += 1) {
  const part = String(index).padStart(2, "0");
  const chunkPath = path.join(embeddingsDir, `chunk-${part}.js`);
  if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
}

console.log(`Wrote ${entries.length} words across ${chunks.length} chunks.`);
