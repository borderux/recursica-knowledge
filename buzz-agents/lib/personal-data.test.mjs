/**
 * Every fixture that should be caught is assembled at runtime. Written out literally, this file
 * would fail the very check it tests the moment it was committed — the same trap
 * placeholders.test.mjs is documented as falling into.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findPersonalData } from "./personal-data.mjs";

const at = (local, domain) => [local, domain].join("@");
const dial = (...parts) => parts.join("-");

test("a person's address at a real provider is caught", () => {
  for (const domain of [
    "gmail.com",
    "outlook.co.uk",
    "some-clinic.org",
    "borderux.com",
  ]) {
    assert.deepEqual(
      findPersonalData(`Reported by ${at("jordan.p", domain)}.`),
      ["a personal email address"],
    );
  }
});

test("placeholder and role addresses are allowed", () => {
  const allowed = [
    at("person.a", "acme.com"),
    at("user", "example.com"),
    at("someone", "mail.example"),
    at("x", "host.test"),
    at("hi", "borderux.com"),
    at("noreply", "anthropic.com"),
    at("123+name", "users.noreply.github.com"),
    at("svc", "acme-research-123456.iam.gserviceaccount.com"),
    `${at("git", "github.com")}:borderux/recursica-knowledge.git`,
  ];
  for (const a of allowed) assert.deepEqual(findPersonalData(a), [], a);
});

test("text that only looks like an address is not caught", () => {
  for (const t of [
    `SELECT * FROM ${at("x", "dataset.conversations")}`,
    '"@recursica/adapter-mantine-v8": "^1.2.1"',
    "host.docker.internal:8009",
  ]) {
    assert.deepEqual(findPersonalData(t), [], t);
  }
});

test("phone numbers are caught, in the shapes people write them", () => {
  for (const n of [
    dial("415", "867", "5309"),
    `(415) ${dial("867", "5309")}`,
    ["+1 415", "867", "5309"].join("."),
    ["+44", "20", "7946", "0958"].join(" "),
  ]) {
    assert.deepEqual(
      findPersonalData(`Call ${n} to confirm.`),
      ["a phone number"],
      n,
    );
  }
});

test("fictional numbers, dates, versions and ids are not caught", () => {
  for (const t of [
    dial("555", "555", "0100"),
    "(415) 555-0100",
    "2026-09-29",
    "version 1.2.1",
    "00000000-0000-0000-0000-000000000000",
    "HERMES_TIMEOUT=4000",
    "12 345 6789",
  ]) {
    assert.deepEqual(findPersonalData(t), [], t);
  }
});
