import { describe, expect, it } from 'vitest';

import { mockOrganization, mockStartups } from './mockData';

describe('mock data public assets', () => {
  it('references the deployed logo paths instead of Hosting SPA fallbacks', () => {
    const logoUrls = [
      mockOrganization.logo,
      ...mockStartups.map((startup) => startup.logo).filter((url): url is string => Boolean(url)),
    ];

    expect(logoUrls).toEqual([
      '/logos/logo_it_park_ventures.jpeg',
      '/logos/startups/aither_logo.jpg',
      '/logos/startups/porte_logo.jpg',
      '/logos/startups/oreotech_logo.jpg',
      '/logos/startups/mediscan_logo.jpg',
      '/logos/startups/agrismart_logo.jpg',
      '/logos/startups/payme_logo.jpg',
      '/logos/startups/quickcapital_logo.jpg',
      '/logos/startups/bilim_logo.jpg',
    ]);
  });
});
