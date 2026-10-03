import test from "node:test";
import assert from "node:assert/strict";
import { mapReadOnlySource } from "../src/iris-provider.js";

const identity = `messagesRotation:${"A".repeat(64)}`;

test("rotated messages inventory keeps opaque identity, observed timestamp, and explicit coverage", () => {
  const mapped = mapReadOnlySource("messageRotations", {
    provider: "opsdeck-rotated-messages-log-v1",
    status: "available",
    coverage: "complete",
    truncated: false,
    scannedCount: 1,
    rotations: [{ sourceIdentity: identity, sourceTimestamp: "2026-10-03 12:34:56", size: 42 }],
  });
  assert.equal(mapped.status, "available");
  assert.equal(mapped.coverage, "complete");
  assert.equal(mapped.rotations[0].sourceIdentity, identity);
  assert.equal(mapped.rotations[0].sourceTimestamp, "2026-10-03 12:34:56");
  assert.equal(JSON.stringify(mapped).includes("messages.old_"), false);
  const untrustedPath = mapReadOnlySource("messageRotations", {
    provider: "opsdeck-rotated-messages-log-v1", status: "empty", coverage: "complete",
    truncated: false, scannedCount: 0, rotations: [], resolvedPath: "/private/messages.old_fixture",
  });
  assert.equal(Object.hasOwn(untrustedPath, "resolvedPath"), false);
});

test("selected rotation detail retains exact source identity and rejects mismatched metadata", () => {
  const payload = {
    status: "available",
    lines: ["fixture observation"],
    truncated: false,
    sourceIdentity: identity,
    sourceTimestamp: "2026-10-03 12:34:56",
  };
  const mapped = mapReadOnlySource(identity, payload);
  assert.equal(mapped.sourceIdentity, identity);
  assert.equal(mapped.sourceTimestamp, payload.sourceTimestamp);
  assert.equal(mapped.items[0].values.line, "fixture observation");
  assert.throws(() => mapReadOnlySource(identity, { ...payload, sourceIdentity: `messagesRotation:${"B".repeat(64)}` }), /identity or timestamp/);
  assert.throws(() => mapReadOnlySource(identity, { ...payload, sourceTimestamp: "not-a-time" }), /identity or timestamp/);
});
