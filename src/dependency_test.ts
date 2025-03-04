import { describe, it } from "../lib/std/testing.ts";
import { assertEquals } from "../lib/std/assert.ts";
import { Dependency } from "./dependency.ts";

describe("parseProps()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/std@0.1.0/version.ts"),
      ),
      {
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/std/version.ts"),
      ),
      undefined,
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/x/hono@v0.1.0"),
      ),
      {
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("npm:node-emoji@1.0.0"),
      ),
      {
        name: "node-emoji",
        version: "1.0.0",
        path: "",
      },
    ));
});
