/**
 * GET /.netlify/functions/products?sheetUrl=<url encodée>
 * Récupère le CSV, parse la ligne 1 en en-têtes (clés en minuscules), renvoie { products, cached }.
 */

const DEFAULT_CACHE_TTL_MS = 60000;

const memoryCache = new Map();

function getTtlMs() {
  const raw = process.env.PRODUCTS_CACHE_TTL_MS;
  if (raw === undefined || raw === "") return DEFAULT_CACHE_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CACHE_TTL_MS;
}

/** Parse le texte CSV complet en tableau de lignes (chaque ligne = tableau de cellules). */
function parseCsvRows(text) {
  const clean = String(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\n" || (c === "\r" && clean[i + 1] === "\n")) {
      if (c === "\r") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
}

function parseCsvToObjects(text) {
  const matrix = parseCsvRows(text);
  if (matrix.length === 0) return [];

  const headerCells = matrix[0].map((h) => String(h).trim().toLowerCase());
  const products = [];

  for (let r = 1; r < matrix.length; r += 1) {
    const cells = matrix[r];
    if (cells.every((c) => String(c).trim() === "")) continue;
    const obj = {};
    for (let c = 0; c < headerCells.length; c += 1) {
      const key = headerCells[c];
      if (!key) continue;
      obj[key] = cells[c] !== undefined ? String(cells[c]).trim() : "";
    }
    products.push(obj);
  }
  return products;
}

exports.handler = async (event) => {
  const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed. Use GET." }),
    };
  }

  const sheetUrl =
    event.queryStringParameters && event.queryStringParameters.sheetUrl
      ? String(event.queryStringParameters.sheetUrl).trim()
      : "";

  if (!sheetUrl) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Query parameter sheetUrl is required." }),
    };
  }

  const ttl = getTtlMs();
  const now = Date.now();
  const cachedEntry = memoryCache.get(sheetUrl);
  let cached = false;

  if (ttl > 0 && cachedEntry && cachedEntry.expiresAt > now) {
    cached = true;
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ products: cachedEntry.products, cached: true }),
    };
  }

  try {
    const res = await fetch(sheetUrl, {
      headers: { Accept: "text/csv,text/plain,*/*" },
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Upstream returned status ${res.status}`,
        }),
      };
    }

    const text = await res.text();
    const products = parseCsvToObjects(text);

    if (ttl > 0) {
      memoryCache.set(sheetUrl, { products, expiresAt: now + ttl });
    } else {
      memoryCache.delete(sheetUrl);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ products, cached }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err && err.message ? err.message : "Internal server error",
      }),
    };
  }
};
