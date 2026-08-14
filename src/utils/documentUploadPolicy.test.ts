import { describe, expect, it } from 'vitest';
import {
  isAllowedDocumentUpload,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from './documentUploadPolicy';

describe('standalone CRM document upload policy', () => {
  it('matches the backend upload extension allow-list', () => {
    expect(isAllowedDocumentUpload('report.PDF')).toBe(true);
    expect(isAllowedDocumentUpload('memo.docx')).toBe(true);
    expect(isAllowedDocumentUpload('model.xlsx')).toBe(true);
    expect(isAllowedDocumentUpload('slides.ppt')).toBe(true);
    expect(isAllowedDocumentUpload('notes.txt')).toBe(false);
    expect(isAllowedDocumentUpload('slides.pptx')).toBe(true);
  });

  it('uses the same 50 MB limit as the backend', () => {
    expect(MAX_DOCUMENT_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });
});
