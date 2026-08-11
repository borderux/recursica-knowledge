// Tests for the redaction staleness report.
//
//   node --test 'buzz-agents/lib/*.test.mjs'
//
// Node's own runner, so there is nothing to install.
//
// Worth encoding rather than checking once by hand: the easy way to silence a false warning is to
// silence it too broadly, and the failure mode is silent by construction — a redaction rule that
// has stopped working would stop being reported, and nobody would find out until something with a
// client's name in it was already pushed.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { findStaleRedactions } from './placeholders.mjs'

const LITERAL = { pattern: 'a specific sentence that moved', reason: 'names a person' }
const STRUCTURAL = { pattern: '\\bresearch_(?!acme\\b)[a-z][a-z0-9_]*', reason: 'a client dataset', structural: true }

describe('which redaction rules are reported as stale', () => {
  it('reports a literal rule that matches nothing — it is pointing at nowhere', () => {
    assert.deepEqual(findStaleRedactions('unrelated text', [LITERAL]), [LITERAL.pattern])
  })

  it('stays quiet about a literal rule that still matches', () => {
    assert.deepEqual(findStaleRedactions(LITERAL.pattern, [LITERAL]), [])
  })

  it('stays quiet about a structural rule that matches nothing — that is success', () => {
    assert.deepEqual(findStaleRedactions('unrelated text', [STRUCTURAL]), [])
  })

  it('stays quiet about a structural rule that does match — this is not a leak report', () => {
    assert.deepEqual(findStaleRedactions('research_someclient', [STRUCTURAL]), [])
  })

  it('reports only the literal one when both are present — the exemption is not too broad', () => {
    assert.deepEqual(findStaleRedactions('unrelated text', [LITERAL, STRUCTURAL]), [LITERAL.pattern])
  })

  it('treats a missing `structural` key as literal, so the exemption is opt-in', () => {
    const noFlag = { pattern: 'never appears anywhere', reason: 'x' }
    assert.deepEqual(findStaleRedactions('unrelated text', [noFlag]), [noFlag.pattern])
  })

  it('holds for the patterns actually shipped: both structural ones are exempt', async () => {
    const { readFileSync } = await import('node:fs')
    const url = new URL('../placeholders.json', import.meta.url)
    const { redactions } = JSON.parse(readFileSync(url, 'utf8'))
    const structural = redactions.filter((r) => r.structural)
    assert.ok(structural.length >= 2, 'the shipped shape-matchers are still flagged structural')
    assert.deepEqual(findStaleRedactions('', structural), [])
  })
})
