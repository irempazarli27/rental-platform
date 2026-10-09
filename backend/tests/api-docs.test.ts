import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name: string;
  regexp: RegExp;
  handle: { stack?: Layer[] };
}

/** Every "METHOD /path" the Express app actually serves, read from its router. */
function registeredRoutes(): string[] {
  const routes: string[] = [];
  const walk = (stack: Layer[], prefix: string) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          const full = `${prefix}${layer.route.path}`.replace(/(.)\/$/, "$1");
          routes.push(`${method.toUpperCase()} ${full}`);
        }
      } else if (layer.name === "router" && layer.handle.stack) {
        // Mount paths only survive as the router's compiled regexp, e.g. ^\/api\/items\/?(?=\/|$)
        const mount = layer.regexp.source.match(/^\^((?:\\\/[\w-]+)+)/)?.[1]?.replace(/\\\//g, "/") ?? "";
        walk(layer.handle.stack, prefix + mount);
      }
    }
  };
  walk((app as unknown as { _router: { stack: Layer[] } })._router.stack, "");
  return routes;
}

function documentedRoutes(): string[] {
  const doc = readFileSync(path.join(__dirname, "..", "API.md"), "utf8");
  return [...doc.matchAll(/^### ((?:GET|POST|PUT|PATCH|DELETE) \S+)$/gm)].map((m) => m[1]!);
}

// API.md is what a mobile app (or anyone else) builds against, so it has to
// move with the code: a route added without a doc entry, or a doc entry left
// behind after a route is removed, fails here.
describe("API.md", () => {
  it("documents every route the app serves", () => {
    const documented = new Set(documentedRoutes());
    expect(registeredRoutes().filter((r) => !documented.has(r))).toEqual([]);
  });

  it("documents no route that no longer exists", () => {
    const registered = new Set(registeredRoutes());
    expect(documentedRoutes().filter((r) => !registered.has(r))).toEqual([]);
  });

  it("finds the routes at all (guards against the walker silently breaking)", () => {
    expect(registeredRoutes()).toEqual(expect.arrayContaining(["GET /api/items", "DELETE /api/users/me", "PATCH /api/rentals/:id/accept"]));
  });
});
