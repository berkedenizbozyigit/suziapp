// ============================================================================
// embed() — swappable multimodal embedding wrapper (SERVER-SIDE ONLY)
// ============================================================================
// One helper turns text and/or an image into a single 1536-dim vector in a
// shared space, so text queries and product/photo images are comparable.
//
// Provider is swappable via the EMBEDDING_PROVIDER secret (default 'cohere').
// Today only Cohere Embed v4 is implemented; add a branch here to swap — NO
// caller changes (search/reembed only ever call embed()). Open/closed by design.
//
// Verified against https://docs.cohere.com/reference/embed (2026-06-30):
//   POST https://api.cohere.com/v2/embed
//   body: { model:'embed-v4.0', input_type, output_dimension:1536,
//           embedding_types:['float'],
//           inputs:[{ content:[ {type:'text',text}, {type:'image_url',image_url:{url}} ] }] }
//   images MUST be base64 data URIs (image/jpeg|png|webp|gif), ≤20MB combined.
//   response: { embeddings: { float: [ [..1536..] ] } }
// ============================================================================

export const EMBED_DIM = 1536;
/** Stored in products.embedding_model so re-embeds are resumable & swap-aware. */
export const EMBED_MODEL = 'cohere-embed-v4.0';

/** Asymmetric input types measurably improve retrieval: documents vs queries. */
export type EmbedInputType = 'search_query' | 'search_document';

export interface EmbedRequest {
  text?: string;
  imageUrl?: string;
  /** default 'search_query' */
  inputType?: EmbedInputType;
}

/** Carries an HTTP status so callers can map provider failures to a response. */
export class EmbedError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'EmbedError';
    this.status = status;
  }
}

const PROVIDER = Deno.env.get('EMBEDDING_PROVIDER') ?? 'cohere';
const API_KEY = Deno.env.get('EMBEDDING_PROVIDER_API_KEY') ?? '';

const COHERE_URL = 'https://api.cohere.com/v2/embed';
const COHERE_MODEL = 'embed-v4.0';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // Cohere's combined-image cap
const REQUEST_TIMEOUT_MS = 20_000;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

/** Embed text and/or an image into one EMBED_DIM vector. */
export async function embed(req: EmbedRequest): Promise<number[]> {
  const text = req.text?.trim() || undefined;
  const imageUrl = req.imageUrl?.trim() || undefined;
  if (!text && !imageUrl) {
    throw new EmbedError('embed() requires text and/or imageUrl', 400);
  }
  if (!API_KEY) {
    throw new EmbedError('EMBEDDING_PROVIDER_API_KEY is not set (function secret)', 500);
  }
  if (PROVIDER !== 'cohere') {
    throw new EmbedError(`Unsupported EMBEDDING_PROVIDER: ${PROVIDER}`, 500);
  }
  return await embedCohere(text, imageUrl, req.inputType ?? 'search_query');
}

async function embedCohere(
  text: string | undefined,
  imageUrl: string | undefined,
  inputType: EmbedInputType,
): Promise<number[]> {
  const content: Array<Record<string, unknown>> = [];
  if (text) content.push({ type: 'text', text });
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: await toDataUri(imageUrl) } });
  }

  const json = await postWithRetry(COHERE_URL, {
    model: COHERE_MODEL,
    input_type: inputType,
    output_dimension: EMBED_DIM,
    embedding_types: ['float'],
    inputs: [{ content }],
  });

  const vec = json?.embeddings?.float?.[0];
  if (!Array.isArray(vec) || vec.length !== EMBED_DIM) {
    throw new EmbedError(`Cohere returned an unexpected embedding (len=${vec?.length ?? 'none'})`);
  }
  return vec as number[];
}

// ---- HTTP with timeout + retry/backoff ------------------------------------

async function postWithRetry(url: string, body: unknown): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, REQUEST_TIMEOUT_MS);

      if (res.ok) return await res.json();

      const retryable = res.status === 429 || res.status >= 500;
      const detail = await safeText(res);
      if (!retryable || attempt === MAX_RETRIES) {
        throw new EmbedError(
          `Cohere embed failed (${res.status}): ${detail}`,
          res.status === 429 ? 429 : 502,
        );
      }
      await backoff(attempt, res.headers.get('retry-after'));
    } catch (e) {
      if (e instanceof EmbedError) throw e; // non-retryable, already classified
      lastErr = e; // network/timeout — retry
      if (attempt === MAX_RETRIES) break;
      await backoff(attempt, null);
    }
  }
  throw new EmbedError(`Cohere embed failed after ${MAX_RETRIES} attempts: ${String(lastErr)}`);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function backoff(attempt: number, retryAfter: string | null): Promise<void> {
  const headerMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
  const base = Number.isFinite(headerMs) ? headerMs : 2 ** (attempt - 1) * 500;
  const jitter = base * 0.25 * Math.random();
  await new Promise((r) => setTimeout(r, base + jitter));
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '<no body>';
  }
}

// ---- image → base64 data URI (Cohere requires data URIs, not plain URLs) ---

async function toDataUri(url: string): Promise<string> {
  if (url.startsWith('data:')) return url; // already a data URI
  const res = await fetchWithTimeout(url, {}, IMAGE_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new EmbedError(`image fetch failed (${res.status}) for ${url}`, 502);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new EmbedError(`image exceeds ${MAX_IMAGE_BYTES} bytes`, 413);
  }
  const contentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return `data:${contentType};base64,${base64(bytes)}`;
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000; // avoid arg-count blowups in String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** pgvector text literal — pass this to RPC/insert params typed `vector`. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
