import { describe, expect, test } from "vitest";
import path from "node:path";
import { compilePrompt, loadLibraryFromDataDir } from "../compiler/index";
import type { CompileInput } from "../compiler/types";

const dataDir = path.join(process.cwd(), "data");
const library = loadLibraryFromDataDir(dataDir);

describe("compilePrompt determinism", () => {
  test("same input twice produces identical output", () => {
    const input: CompileInput = {
      character_ref: "char_ref_1",
      selected_modules: ["facial_pose_primary_moods", "anatomy_pose_fashion_stances"],
    };
    const a = compilePrompt(input, library).prompt;
    const b = compilePrompt(input, library).prompt;
    expect(a).toBe(b);
  });

  test("selection order does not change output", () => {
    const input1: CompileInput = {
      character_ref: "char_ref_1",
      selected_modules: ["anatomy_pose_fashion_stances", "facial_pose_primary_moods"],
    };
    const input2: CompileInput = {
      character_ref: "char_ref_1",
      selected_modules: ["facial_pose_primary_moods", "anatomy_pose_fashion_stances"],
    };
    const a = compilePrompt(input1, library).prompt;
    const b = compilePrompt(input2, library).prompt;
    expect(a).toBe(b);
  });

  test("missing required reference throws", () => {
    const input: CompileInput = {
      selected_modules: ["facial_pose_primary_moods"],
    };
    expect(() => compilePrompt(input, library)).toThrow();
  });

  test("duplicate constraints appear once", () => {
    const input: CompileInput = {
      character_ref: "char_ref_1",
      selected_modules: ["facial_pose_primary_moods", "facial_pose_bizarre_expressions"],
    };
    const out = compilePrompt(input, library);
    const count = out.dedupedConstraints.filter((c) => c === "Exact 3x2 grid, exactly 6 frames").length;
    expect(count).toBe(1);
  });

  test("no selected modules still outputs identity + global rules", () => {
    const input: CompileInput = {
      selected_modules: [],
    };
    const out = compilePrompt(input, library).prompt;
    expect(out).toContain("GLOBAL RULES");
    expect(out).toContain("IDENTITY & REFERENCES");
  });
});
