import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveRole } from '../../auth/roles';

test('resolveActiveRole prefers explicit route roles when present', () => {
  assert.equal(resolveActiveRole(['parent', 'admin'], 'parent'), 'parent');
  assert.equal(resolveActiveRole(['parent', 'admin'], 'admin'), 'admin');
  assert.equal(resolveActiveRole(['parent', 'tutor', 'admin'], 'tutor'), 'tutor');
});

test('resolveActiveRole uses dashboard priority when no route role is requested', () => {
  assert.equal(resolveActiveRole(['parent', 'admin']), 'admin');
  assert.equal(resolveActiveRole(['parent', 'student']), 'student');
  assert.equal(resolveActiveRole(['parent', 'tutor']), 'tutor');
});

test('resolveActiveRole supports lesson role preference order', () => {
  assert.equal(resolveActiveRole(['parent', 'admin', 'tutor'], ['tutor', 'student']), 'tutor');
  assert.equal(resolveActiveRole(['parent', 'student'], ['tutor', 'student']), 'student');
});

