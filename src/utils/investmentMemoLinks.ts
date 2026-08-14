export interface InvestmentMemoLinkFields {
  htmlUrl?: string | null;
  docxUrl?: string | null;
  url?: string | null;
  htmlFileName?: string | null;
  docxFileName?: string | null;
  fileName?: string | null;
}

function firstFilled(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export function investmentMemoPreviewUrl(memo?: InvestmentMemoLinkFields | null): string {
  return firstFilled(memo?.htmlUrl, memo?.docxUrl, memo?.url);
}

export function investmentMemoPreviewFileName(memo?: InvestmentMemoLinkFields | null): string {
  return memo?.htmlUrl?.trim()
    ? firstFilled(memo?.htmlFileName)
    : firstFilled(memo?.docxFileName, memo?.fileName);
}

export function investmentMemoDownloadUrl(memo?: InvestmentMemoLinkFields | null): string {
  return firstFilled(memo?.docxUrl, memo?.url, memo?.htmlUrl);
}

export function investmentMemoDownloadFileName(memo?: InvestmentMemoLinkFields | null): string {
  return firstFilled(memo?.docxFileName, memo?.fileName);
}
