export const AUTOFILL_ACCEPT = '.pdf,.pptx';

export function isSupportedAutofillFilename(filename: string): boolean {
  const extension = (filename.split('.').pop() || '').trim().toLowerCase();
  return extension === 'pdf' || extension === 'pptx';
}
