const crypto = require("node:crypto");

const DOCUMENT_EXTENSIONS = new Set([".pdf"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"]);

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const config = getConfig();
  if (!config.ok) {
    return res.status(500).json({ error: config.error });
  }

  try {
    const objects = await listAllObjects(config.value);
    const payload = buildInventory(config.value, objects);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar el bucket R2";
    return res.status(500).json({ error: message });
  }
};

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const prefix = normalizePrefix(process.env.R2_PREFIX || "SCOUT/");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return {
      ok: false,
      error: "Faltan variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY o R2_BUCKET_NAME.",
    };
  }

  return {
    ok: true,
    value: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      endpointHost: `${accountId}.r2.cloudflarestorage.com`,
      prefix,
    },
  };
}

async function listAllObjects(config) {
  const objects = [];
  let continuationToken = "";

  do {
    const query = {
      "list-type": "2",
      prefix: config.prefix,
    };
    if (continuationToken) query["continuation-token"] = continuationToken;

    const url = buildUrl(config.endpointHost, config.bucket, query);
    const headers = signRequest({
      method: "GET",
      url,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      payload: "",
    });

    const response = await fetch(url, { method: "GET", headers });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`R2 respondió ${response.status}: ${body.slice(0, 240)}`);
    }

    const parsed = parseListObjectsV2(body);
    objects.push(...parsed.contents);
    continuationToken = parsed.nextContinuationToken;
  } while (continuationToken);

  return objects;
}

function buildInventory(config, objects) {
  const items = objects
    .map((object) => toInventoryItem(config.prefix, object))
    .filter(Boolean)
    .sort((a, b) => a.file.localeCompare(b.file, "es", { sensitivity: "base" }));

  const documents = items.filter((item) => item.section === "documents");
  const graphics = items.filter((item) => item.section === "graphics");

  return {
    libraryTitle: "Biblioteca Scout Chilena Rescatada",
    generatedAt: new Date().toISOString().slice(0, 10),
    fileCount: items.length,
    documentCount: documents.length,
    graphicCount: graphics.length,
    source: "r2",
    items,
  };
}

function toInventoryItem(prefix, object) {
  const key = object.key || "";
  if (!key.startsWith(prefix) || key.endsWith("/")) return null;

  const relative = key.slice(prefix.length);
  if (!relative) return null;

  const extension = extname(relative);
  if (!DOCUMENT_EXTENSIONS.has(extension) && !IMAGE_EXTENSIONS.has(extension)) {
    return null;
  }

  const parts = relative.split("/").filter(Boolean);
  const topLevel = parts[0] || "GENERAL";
  const stem = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  const title = humanTitle(stem);
  const isGraphic = topLevel.toUpperCase() === "MATERIAL GRAFICO" || IMAGE_EXTENSIONS.has(extension);
  const category = isGraphic ? (parts[1] || "GENERAL") : topLevel;

  return {
    title,
    file: relative,
    category,
    collection: topLevel,
    section: isGraphic ? "graphics" : "documents",
    kind: isGraphic ? "image" : "document",
    extension: extension.slice(1),
    sizeBytes: object.sizeBytes,
    updatedAt: object.lastModified,
  };
}

function humanTitle(stem) {
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\bOK\b/gi, "")
    .replace(/\b(pdf|png|jpg|jpeg|svg|webp|gif|avif)\b/gi, "")
    .replace(/\b(\d+\.\d+|\d+)\b/g, (match) => (match.length <= 2 ? "" : match))
    .replace(/\s+/g, " ")
    .trim();
}

function parseListObjectsV2(xml) {
  const contents = [];
  const contentBlocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];

  for (const block of contentBlocks) {
    const key = decodeXmlEntity(readTag(block, "Key"));
    const sizeValue = readTag(block, "Size");
    const lastModified = readTag(block, "LastModified");

    if (!key) continue;

    contents.push({
      key,
      sizeBytes: Number(sizeValue || 0),
      lastModified,
    });
  }

  return {
    contents,
    nextContinuationToken: decodeXmlEntity(readTag(xml, "NextContinuationToken")),
  };
}

function readTag(input, tagName) {
  const match = input.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? match[1] : "";
}

function decodeXmlEntity(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function buildUrl(host, bucket, query) {
  const queryString = canonicalQueryString(query);
  return `https://${host}/${encodePathSegment(bucket)}?${queryString}`;
}

function signRequest({ method, url, accessKeyId, secretAccessKey, payload }) {
  const target = new URL(url);
  const amzDate = isoTimestamp(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payload);
  const canonicalQuery = canonicalQueryStringFromUrl(target);
  const canonicalUri = target.pathname
    .split("/")
    .map((part) => encodePathSegment(decodeURIComponent(part)))
    .join("/");

  const canonicalHeaders =
    `host:${target.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmacHex(signingKey(secretAccessKey, dateStamp), stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorization,
    host: target.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
}

function signingKey(secretAccessKey, dateStamp) {
  const kDate = hmacBuffer(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacBuffer(kDate, "auto");
  const kService = hmacBuffer(kRegion, "s3");
  return hmacBuffer(kService, "aws4_request");
}

function canonicalQueryStringFromUrl(target) {
  const entries = [];
  for (const [key, value] of target.searchParams.entries()) {
    entries.push([awsUriEncode(key), awsUriEncode(value)]);
  }

  return entries
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) return aValue.localeCompare(bValue);
      return aKey.localeCompare(bKey);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function canonicalQueryString(query) {
  return Object.entries(query)
    .map(([key, value]) => [awsUriEncode(key), awsUriEncode(String(value))])
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) return aValue.localeCompare(bValue);
      return aKey.localeCompare(bKey);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function encodePathSegment(segment) {
  return segment
    .split("/")
    .map((part) => awsUriEncode(part))
    .join("/");
}

function awsUriEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function isoTimestamp(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmacBuffer(key, value) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key, value) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function normalizePrefix(value) {
  const trimmed = String(value).trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `${trimmed}/` : "";
}

function extname(file) {
  const match = file.toLowerCase().match(/(\.[^.\/]+)$/);
  return match ? match[1] : "";
}
