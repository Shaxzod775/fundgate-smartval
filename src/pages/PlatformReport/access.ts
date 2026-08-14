export const PLATFORM_REPORT_ORG_IDS = ['org-platform', 'org-itpark'];

export function canSeePlatformReport(organizationId?: string | null): boolean {
  return Boolean(organizationId && PLATFORM_REPORT_ORG_IDS.includes(organizationId));
}
