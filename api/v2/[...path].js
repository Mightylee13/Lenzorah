const API_BASE = "https://movieapi.gifted.co.ke/api/v2";
const API_KEY =
  process.env.VITE_API_KEY || process.env.API_KEY || process.env.MOVIE_API_KEY;

function getPathParts(req) {
  const pathValue = req.query?.path;
  if (Array.isArray(pathValue)) return pathValue;
  if (typeof pathValue === "string" && pathValue.length > 0) return [pathValue];
  return [];
}

function buildTargetUrl(req) {
  const pathParts = getPathParts(req);
  const target = new URL(API_BASE);

  if (pathParts.length > 0) {
    target.pathname = `${target.pathname.replace(/\/$/, "")}/${pathParts.join("/")}`;
  }

  const requestUrl = new URL(req.url, "https://vercel.local");
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== "path") {
      target.searchParams.append(key, value);
    }
  });

  return target.toString();
}

async function readRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  try {
    if (!API_KEY) {
      console.error("Missing API key for movie API proxy");
      return res.status(500).json({
        error:
          "Missing API key. Set VITE_API_KEY in Vercel environment variables.",
      });
    }

    const targetUrl = buildTargetUrl(req);
    const body = await readRequestBody(req);

    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": req.headers["content-type"] || "application/json",
      Accept: req.headers.accept || "application/json",
      "User-Agent": "Vercel-Proxy",
    };

    console.log("TARGET:", targetUrl);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseText = await response.text();

    res.status(response.status);

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Cache-Control", "no-store");

    return res.send(responseText);
  } catch (error) {
    console.error("Vercel API proxy error:", error);
    return res.status(500).json({
      error: "Proxy request failed",
    });
  }
}
