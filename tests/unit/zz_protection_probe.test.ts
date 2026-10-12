// Throwaway probe for branch protection on main (2026-10-12): this test must
// FAIL so the gates check fails, proving a merge is refused. The branch is
// never merged; the PR is closed and the branch deleted after the check.
import { expect, it } from 'vitest';

it('branch-protection probe (deliberately fails)', () => {
  expect(1).toBe(2);
});
