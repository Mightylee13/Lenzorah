const API_KEY =
  process.env.VITE_API_KEY ||
  process.env.API_KEY ||
  process.env.MOVIE_API_KEY;

const API_BASE = (
  process.env.VITE_API_BASE ||
  "https://movieapi.gifted.co.ke"
).replace(/\/$/, "");

export default async (request) => {
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing API key" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const url = new URL(request.url);
  const apiPath = url.pathname.replace(/^\/api\/v2/, "") || "/";
  const targetUrl = new URL(`${API_BASE}/api/v2${apiPath}`);
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const fetchOptions = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Netlify-Proxy",
    },
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    fetchOptions.duplex = "half";
  }

  const upstream = await fetch(targetUrl.toString(), fetchOptions);
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const config = {
  path: "/api/v2/*",
};
