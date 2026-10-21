// The browser suite runs against a Next development server, which compiles each route
// on its first request. The navigation test visits all four routes, so without this it
// pays every compile inside its own 60s budget and fails intermittently. Requesting each
// route once here moves that cost out of the tests.
const ROUTES = ["/", "/scout", "/optimize", "/jobs", "/profile"];

export default async function globalSetup() {
  for (const route of ROUTES) {
    const response = await fetch(`http://127.0.0.1:3100${route}`);
    if (!response.ok) throw new Error(`Warm-up request for ${route} returned ${response.status}`);
  }
}
