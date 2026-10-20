import { describe, expect, it } from "vitest";

import fixture from "./fixtures/rippling.json";
import {
  ApplicationPlanError,
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
  parseApplicationPlanRequest,
  validateApplicationPlan,
} from "./contract";

function setup() {
  const request = parseApplicationPlanRequest(JSON.stringify(fixture.request));
  const response = structuredClone(fixture.response);
  const evidence = structuredClone(fixture.evidenceContext);
  const current = structuredClone(request);
  return {
    request,
    response,
    evidence,
    current,
    validate: () =>
      validateApplicationPlan(
        JSON.stringify(response),
        request,
        current,
        evidence,
      ),
  };
}

function expectCode(action: () => unknown, code: string) {
  try {
    action();
    expect.fail("Expected validation to reject the payload");
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationPlanError);
    expect((error as ApplicationPlanError).code).toBe(code);
  }
}

describe("application-plan v1", () => {
  it("accepts a representative Rippling review plan without mutating the source", () => {
    const state = setup();
    expect(state.validate()).toEqual(fixture.response);
    expect(state.request).toEqual(fixture.request);
    expect(state.response).toEqual(fixture.response);
  });

  it("uses the same contract for a generic form", () => {
    const state = setup();
    state.request.ats = state.current.ats = "generic";
    expect(state.validate().candidates).toHaveLength(3);
  });

  it.each([
    null,
    [],
    {},
    { ...fixture.request, version: 2 },
    { ...fixture.request, resume: "private source" },
  ])("rejects unknown request shapes and versions: %j", (value) => {
    expectCode(
      () => parseApplicationPlanRequest(JSON.stringify(value)),
      "invalid-request",
    );
  });

  it("rejects malformed JSON without echoing it", () => {
    expectCode(
      () => parseApplicationPlanRequest("private resume content"),
      "invalid-json",
    );
  });

  it("bounds UTF-8 bytes before parsing, including multibyte input", () => {
    expectCode(
      () => parseApplicationPlanRequest("é".repeat(MAX_REQUEST_BYTES / 2 + 1)),
      "payload-too-large",
    );
    const state = setup();
    expectCode(
      () =>
        validateApplicationPlan(
          " ".repeat(MAX_RESPONSE_BYTES + 1),
          state.request,
          state.current,
          state.evidence,
        ),
      "payload-too-large",
    );
  });

  it.each([
    { ...fixture.request, fields: [] },
    { ...fixture.request, fields: Array(101).fill(fixture.request.fields[0]) },
    {
      ...fixture.request,
      fields: [fixture.request.fields[0], fixture.request.fields[0]],
    },
    {
      ...fixture.request,
      fields: [{ ...fixture.request.fields[0], label: "x".repeat(301) }],
    },
    {
      ...fixture.request,
      fields: [{ ...fixture.request.fields[0], fieldId: "#form input" }],
    },
    {
      ...fixture.request,
      fields: [
        { ...fixture.request.fields[0], value: "existing private answer" },
      ],
    },
    {
      ...fixture.request,
      fields: [
        { ...fixture.request.fields[2], options: ["Seattle", "Seattle"] },
      ],
    },
    {
      ...fixture.request,
      fields: [{ ...fixture.request.fields[2], options: [] }],
    },
    {
      ...fixture.request,
      fields: [{ ...fixture.request.fields[0], options: ["unexpected"] }],
    },
  ])("rejects unbounded or ambiguous fields: %j", (value) => {
    expectCode(
      () => parseApplicationPlanRequest(JSON.stringify(value)),
      "invalid-request",
    );
  });

  it.each([
    "javascript:alert(1)",
    "file:///tmp/resume",
    "https://user:password@example.com/job",
  ])("rejects unsafe job URLs: %s", (jobUrl) => {
    expectCode(
      () =>
        parseApplicationPlanRequest(
          JSON.stringify({ ...fixture.request, jobUrl }),
        ),
      "invalid-request",
    );
  });

  it.each(["requestId", "scanId", "jobUrl", "profileVersion"] as const)(
    "rejects a response for a different %s",
    (key) => {
      const state = setup();
      state.response[key] =
        key === "jobUrl" ? "https://example.com/other" : "other-id";
      expectCode(state.validate, "invalid-plan");
    },
  );

  it.each([
    "label",
    "type",
    "required",
    "sensitivity",
    "options",
    "context",
    "fieldId",
  ])("rejects a field changed since preview: %s", (key) => {
    const state = setup();
    const changes = {
      label: "Different question",
      type: "textarea",
      required: false,
      sensitivity: "personal-declaration",
      options: ["Different choice"],
      context: "Different section",
      fieldId: "replacement-field",
    };
    const index = key === "options" ? 2 : 0;
    Object.assign(state.current.fields[index], {
      [key]: changes[key as keyof typeof changes],
    });
    expectCode(state.validate, "stale-scan");
  });

  it("rejects navigation, a new scan, and removed fields", () => {
    for (const mutate of [
      (state: ReturnType<typeof setup>) => {
        state.current.jobUrl = "https://example.com/other";
      },
      (state: ReturnType<typeof setup>) => {
        state.current.scanId = "new-scan";
      },
      (state: ReturnType<typeof setup>) => {
        state.current.fields.pop();
      },
    ]) {
      const state = setup();
      mutate(state);
      expectCode(state.validate, "stale-scan");
    }
  });

  it("does not depend on field enumeration order", () => {
    const state = setup();
    state.current.fields.reverse();
    expect(state.validate()).toEqual(fixture.response);
  });

  it.each(["unknown", "unverified", "duplicate"])(
    "rejects %s evidence",
    (kind) => {
      const state = setup();
      if (kind === "unknown")
        state.response.candidates[0].evidenceIds = ["invented-fact"];
      if (kind === "unverified") state.evidence.evidence[0].verified = false;
      if (kind === "duplicate")
        state.evidence.evidence.push(state.evidence.evidence[0]);
      expectCode(state.validate, "invalid-plan");
    },
  );

  it("rejects missing evidence and out-of-range confidence", () => {
    const state = setup();
    state.response.candidates[0].evidenceIds = [];
    expectCode(state.validate, "invalid-response");
    state.response = structuredClone(fixture.response);
    // The closure captures its original response; validate the replaced object explicitly.
    state.response.candidates[0].confidence = 1.1;
    expectCode(
      () =>
        validateApplicationPlan(
          JSON.stringify(state.response),
          state.request,
          state.current,
          state.evidence,
        ),
      "invalid-response",
    );
  });

  it.each([
    "unknown-field",
    "duplicate-candidate",
    "duplicate-unanswered",
    "both",
    "omitted",
  ])("rejects incomplete or ambiguous coverage: %s", (kind) => {
    const state = setup();
    if (kind === "unknown-field")
      state.response.candidates[0].fieldId = "invented-field";
    if (kind === "duplicate-candidate")
      state.response.candidates.push(state.response.candidates[0]);
    if (kind === "duplicate-unanswered")
      state.response.unanswered.push(state.response.unanswered[0]);
    if (kind === "both")
      state.response.unanswered.push({
        fieldId: "field-name",
        reason: "uncertain",
      });
    if (kind === "omitted") state.response.unanswered.pop();
    expectCode(state.validate, "invalid-plan");
  });

  it.each(["field-sponsorship", "field-resume", "field-widget"])(
    "leaves %s for manual handling regardless of confidence",
    (fieldId) => {
      const state = setup();
      const index = state.response.unanswered.findIndex(
        (field) => field.fieldId === fieldId,
      );
      state.response.unanswered.splice(index, 1);
      state.response.candidates.push({
        ...state.response.candidates[0],
        fieldId,
        value: "No",
        confidence: 1,
      });
      expectCode(state.validate, "invalid-plan");
    },
  );

  it("keeps manual handling reasons explicit", () => {
    const state = setup();
    state.response.unanswered[0].reason = "uncertain";
    expectCode(state.validate, "invalid-plan");
  });

  it("rejects choices outside the scanned options and malformed emails", () => {
    const state = setup();
    state.response.candidates[2].value = "New York";
    expectCode(state.validate, "invalid-plan");
    state.response.candidates[2].value = "Seattle";
    state.response.candidates[1].value = "not-an-email";
    expectCode(state.validate, "invalid-plan");
  });

  it.each([
    { submit: true },
    { script: "document.forms[0].submit()" },
    { selector: "#application" },
  ])("rejects executable instruction properties: %j", (instruction) => {
    const state = setup();
    Object.assign(state.response, instruction);
    expectCode(state.validate, "invalid-response");
  });

  it("rejects nested DOM instructions and bypassing review", () => {
    const state = setup();
    Object.assign(state.response.candidates[0], {
      selector: "#name",
      requiresReview: false,
    });
    expectCode(state.validate, "invalid-response");
  });

  it.each([
    "<script>alert(1)</script>",
    "javascript:alert(1)",
    '<img src=x onerror="alert(1)">',
    "   ",
  ])("rejects executable or blank candidate values: %s", (value) => {
    const state = setup();
    state.response.candidates[0].value = value;
    expectCode(state.validate, "invalid-plan");
  });

  it("keeps ordinary technical text as inert data", () => {
    const state = setup();
    state.response.candidates[0].value = "JavaScript and React developer";
    expect(state.validate().candidates[0].value).toBe(
      "JavaScript and React developer",
    );
  });
});
