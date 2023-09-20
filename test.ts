import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  collectModuleUpdateJsonAll,
  createDependencyUpdateJson,
  execModuleUpdateJson,
  execModuleUpdateJsonAll,
  ModuleUpdateJson,
} from "./mod.ts";
import { console, SEMVER_REGEXP } from "./src/lib.ts";

describe("createDependencyUpdateJson()", () => {
  it("https://deno.land/std", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/std@0.1.0/version.ts",
    });
    assertExists(update);
    assert(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/std/version.ts",
    });
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
    });
    assertExists(update);
    assertExists(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
  it("npm:node-emoji", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "npm:node-emoji@1.0.0",
    });
    assertExists(update);
    assertExists(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
});

describe("collectDependencyUpdateJson()", () => {
  it("https://deno.land/x/deno_graph", async () => {
    const updates = await collectModuleUpdateJsonAll(
      "./src/fixtures/mod.ts",
    );
    console.debug(updates);
    assertEquals(updates.length, 3);
    assertExists(updates[0].newSpecifier.match(SEMVER_REGEXP));
    assertExists(updates[1].newSpecifier.match(SEMVER_REGEXP));
    assertExists(updates[2].newSpecifier.match(SEMVER_REGEXP));
  });
});

describe("execModuleUpdateJson", () => {
  let updates: ModuleUpdateJson[];
  beforeAll(async () => {
    updates = await collectModuleUpdateJsonAll(
      "./src/fixtures/mod.ts",
    );
  });
  it("https://deno.land/std", async () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/std")
    )!;
    const result = await execModuleUpdateJson(update);
    assertExists(result);
    assertExists(result.content);
    console.debug(result.content);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/x/deno_graph")
    )!;
    const result = await execModuleUpdateJson(update);
    assertExists(result);
    assertExists(result.content);
    console.debug(result.content);
  });
  it("npm:node-emoji", async () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = await execModuleUpdateJson(update);
    assertExists(result);
    assertExists(result.content);
    console.debug(result.content);
  });
});

describe("execModuleUpdateJsonAll", () => {
  it("src/fixtures/mod.ts", async () => {
    const results = await execModuleUpdateJsonAll(
      await collectModuleUpdateJsonAll("./src/fixtures/mod.ts"),
    );
    assertEquals(results.length, 3);
  });
});
