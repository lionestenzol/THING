import { describe, expect, test } from "vitest";
import path from "node:path";
import { loadLibraryFromDataDir } from "../compiler/index";
import { initialState, reduce, validateState } from "../compiler/stateMachine";

const dataDir = path.join(process.cwd(), "data");
const library = loadLibraryFromDataDir(dataDir);

describe("B2 state machine", () => {
  test("select module replaces within category (cap v1)", () => {
    let s = initialState();
    s = reduce(s, { type: "SET_REF", slot: "character", value: "char_ref" }, library);
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    expect(s.selected.facial_pose).toEqual(["facial_pose_primary_moods"]);
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_bizarre_expressions" }, library);
    expect(s.selected.facial_pose).toEqual(["facial_pose_bizarre_expressions"]);
  });

  test("missing character reference triggers validation error", () => {
    let s = initialState();
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    expect(s.errors.join(" ")).toContain("Missing character reference");
    expect(s.compiled).toBeNull();
  });

  test("compile fails when invalid; succeeds when valid", () => {
    let s = initialState();
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    s = reduce(s, { type: "COMPILE" }, library);
    expect(s.compiled).toBeNull();
    expect(s.errors.length).toBeGreaterThan(0);

    s = reduce(s, { type: "SET_REF", slot: "character", value: "char_ref" }, library);
    s = reduce(s, { type: "COMPILE" }, library);
    expect(s.errors).toEqual([]);
    expect(s.compiled?.prompt).toContain("FACIAL POSES");
  });

  test("hands-only cannot be combined in v1", () => {
    let s = initialState();
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "anatomy_pose_hand_gestures" }, library);
    expect(s.errors).toEqual([]); // alone is allowed

    // attempt to add another module should error
    s = reduce(s, { type: "SET_REF", slot: "character", value: "char_ref" }, library);
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    expect(s.errors.join(" ")).toContain("hands-only");
  });

  test("environment-only cannot be combined in v1", () => {
    let s = initialState();
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "cinematography_editorial_set_projection" }, library);
    expect(s.errors.join(" ")).toContain("Missing environment reference");

    s = reduce(s, { type: "SET_REF", slot: "environment", value: "env_ref" }, library);
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    expect(s.errors.join(" ")).toContain("Environment-only");
  });

  test("validateState matches reducer errors", () => {
    let s = initialState();
    s = reduce(s, { type: "SELECT_MODULE", moduleId: "facial_pose_primary_moods" }, library);
    const errors = validateState(s, library);
    expect(errors).toEqual(s.errors);
  });
});
