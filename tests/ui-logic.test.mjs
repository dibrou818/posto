import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthRedirect } from '../src/lib/authRedirect.ts';
import { eventStatus } from '../src/lib/eventStatus.ts';

test('authentication returns to internal content and rejects external redirects', () => {
  assert.equal(safeAuthRedirect('/events/example?from=favorites'), '/events/example?from=favorites');
  for (const path of [undefined, '', '//example.com', '/\\example.com', 'https://example.com', '/\n/example.com']) {
    assert.equal(safeAuthRedirect(path), '/account');
  }
});

test('event status respects start/end boundaries without inventing an end time', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  assert.equal(eventStatus('2026-09-21T12:00:00Z', null, now), 'À venir');
  assert.equal(eventStatus('2026-09-20T12:30:00Z', null, now), 'Commence bientôt');
  assert.equal(eventStatus('2026-09-20T12:00:00Z', '2026-09-20T14:00:00Z', now), 'En cours');
  assert.equal(eventStatus('2026-09-20T11:00:00Z', '2026-09-20T12:20:00Z', now), 'Se termine bientôt');
  assert.equal(eventStatus('2026-09-20T11:00:00Z', '2026-09-20T12:00:00Z', now), 'Terminé');
  assert.equal(eventStatus('2026-09-20T11:00:00Z', null, now), 'Début passé');
  assert.equal(eventStatus('invalid', null, now), 'Date à confirmer');
});
