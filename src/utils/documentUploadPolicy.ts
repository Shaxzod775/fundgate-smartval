export const MAX_DOCUMENT_UPLOAD_BYTES = 50 * 1024 * 1024;

const DOCUMENT_UPLOAD_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
]);

export function isAllowedDocumentUpload(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return DOCUMENT_UPLOAD_EXTENSIONS.has(extension);
}
