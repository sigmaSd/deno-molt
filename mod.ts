// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to update dependencies in Deno projects using deno_graph.
 *
 * ### Example
 *
 * To update all dependencies in a module and commit the changes to git:
 *
 * ```ts
 * import {
 *   collectDependencyUpdates,
 *   execDependencyUpdateAll,
 * } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 * import {
 *   commitAll,
 *   createPullRequestBody,
 * } from "https://deno.land/x/molt@{VERSION}/lib/git.ts";
 *
 * const updates = await collectDependencyUpdateAll("./mod.ts");
 * const results = await execDependencyUpdateAll(updates);
 * console.log(results);
 *
 * // Commit all changes to git
 * await commitAll(results, {
 *   groupBy: (it) => it.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 *
 * const summary = createPullRequestBody(updates);
 * console.log(summary);
 * ```
 *
 * @module
 */

import {
  fromFileUrl,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import {
  createGraph,
  CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import {
  createDependencyUpdate,
  DependencyUpdate as _DependencyUpdate,
} from "./src/core.ts";
import { createUrl } from "./src/utils.ts";

class DenoGraph {
  static #initialized = false;

  static async ensureInit() {
    if (this.#initialized) {
      return;
    }
    await initDenoGraph();
    this.#initialized = true;
  }
}

export interface DependencyUpdate extends _DependencyUpdate {
  referrer: string;
}

export interface CreateDependencyUpdateOptions {
  loadRemote?: boolean;
}

export async function collectDependencyUpdateAll(
  rootModule: string,
  options: CreateDependencyUpdateOptions = {
    loadRemote: false,
  },
): Promise<DependencyUpdate[]> {
  await DenoGraph.ensureInit();
  const specifier = toFileUrl(resolve(rootModule)).href;
  const graph = await createGraph(specifier, {
    load: createLoadCallback(options),
  });
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await createDependencyUpdate(dependency);
        return update
          ? updates.push({ ...update, referrer: module.specifier })
          : undefined;
      })
    ),
  );
  return updates;
}

function createLoadCallback(
  options: CreateDependencyUpdateOptions,
): CreateGraphOptions["load"] {
  // deno-lint-ignore require-await
  return async (specifier) => {
    const url = createUrl(specifier);
    if (!url) {
      throw new Error(`Invalid specifier: ${specifier}`);
    }
    switch (url.protocol) {
      case "node:":
      case "npm:":
        return {
          kind: "external",
          specifier,
        };
      case "http:":
      case "https:":
        if (options.loadRemote) {
          return defaultLoad(specifier);
        }
        return {
          kind: "external",
          specifier,
        };
      default:
        return defaultLoad(specifier);
    }
  };
}

export interface ModuleUpdateResult extends DependencyUpdate {
  content: string;
}

export async function execDependencyUpdateAll(
  updates: DependencyUpdate[],
): Promise<ModuleUpdateResult[]> {
  const results: ModuleUpdateResult[] = [];
  await Promise.all(updates.map(async (update) => {
    const result = await execDependencyUpdate(update);
    return result ? results.push(result) : undefined;
  }));
  return results;
}

export async function execDependencyUpdate(
  update: DependencyUpdate,
): Promise<ModuleUpdateResult | undefined> {
  if (!update.code) {
    console.warn(`No code found for ${update.specifier}`);
    return;
  }
  if (update.code.span.start.line !== update.code.span.end.line) {
    console.warn(
      `The import specifier ${update.specifier} in ${update.referrer} is not a single line`,
    );
    return;
  }
  const line = update.code.span.start.line;
  const content = await Deno.readTextFile(fromFileUrl(update.referrer));
  const lines = content.split("\n");

  lines[line] = lines[line].slice(0, update.code.span.start.character) +
    `"${update.specifier.replace(update.version.from, update.version.to)}"` +
    lines[line].slice(update.code.span.end.character);

  return {
    ...update,
    content: lines.join("\n"),
  };
}
