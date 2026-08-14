import { describe, expect, it } from 'vitest';
import {
  investmentMemoDownloadFileName,
  investmentMemoDownloadUrl,
  investmentMemoPreviewFileName,
  investmentMemoPreviewUrl,
} from './investmentMemoLinks';

const full = {
  htmlUrl: 'https://crm-api.example/crm/files/aHRtbA?x=1',
  docxUrl: 'https://crm-api.example/crm/files/ZG9jeA?x=1',
  url: 'https://crm-api.example/crm/files/bGVnYWN5',
  htmlFileName: 'AITHER-investment-memo.html',
  docxFileName: 'AITHER-investment-memo.docx',
  fileName: 'AITHER-investment-memo.docx',
};

describe('investmentMemoPreviewUrl', () => {
  it('берёт HTML — ради него всё и делалось', () => {
    expect(investmentMemoPreviewUrl(full)).toBe(full.htmlUrl);
    expect(investmentMemoPreviewFileName(full)).toBe('AITHER-investment-memo.html');
  });

  it('у старых мемо HTML нет — честно откатывается на .docx', () => {
    const legacy = { docxUrl: full.docxUrl, docxFileName: full.docxFileName };
    expect(investmentMemoPreviewUrl(legacy)).toBe(full.docxUrl);
    expect(investmentMemoPreviewFileName(legacy)).toBe('AITHER-investment-memo.docx');
  });

  it('совсем древние — только legacy-поле url', () => {
    expect(investmentMemoPreviewUrl({ url: full.url })).toBe(full.url);
  });

  it('пустые строки не считаются ссылкой', () => {
    expect(investmentMemoPreviewUrl({ htmlUrl: '  ', docxUrl: full.docxUrl })).toBe(full.docxUrl);
    expect(investmentMemoPreviewUrl({})).toBe('');
    expect(investmentMemoPreviewUrl(null)).toBe('');
    expect(investmentMemoPreviewUrl(undefined)).toBe('');
  });
});

describe('investmentMemoDownloadUrl', () => {
  it('всегда отдаёт .docx, даже когда HTML под рукой', () => {
    expect(investmentMemoDownloadUrl(full)).toBe(full.docxUrl);
    expect(investmentMemoDownloadFileName(full)).toBe('AITHER-investment-memo.docx');
  });

  it('без .docx — legacy url, и только в последнюю очередь HTML', () => {
    expect(investmentMemoDownloadUrl({ htmlUrl: full.htmlUrl, url: full.url })).toBe(full.url);
    expect(investmentMemoDownloadUrl({ htmlUrl: full.htmlUrl })).toBe(full.htmlUrl);
  });

  it('пустое мемо не даёт ссылки', () => {
    expect(investmentMemoDownloadUrl({})).toBe('');
    expect(investmentMemoDownloadFileName({})).toBe('');
  });
});
