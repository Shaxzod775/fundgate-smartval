import { describe, expect, it } from 'vitest';

import StartupsSource from './Startups.tsx?raw';

describe('retired Grey Zone', () => {
  it('cannot be re-enabled by a merge or snapshot restore', () => {
    expect(StartupsSource).toContain('const GREY_ZONE_ENABLED = false;');
    expect(StartupsSource).not.toContain('const GREY_ZONE_ENABLED = true;');
  });
});
