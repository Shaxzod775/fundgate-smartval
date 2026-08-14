import { describe, expect, it } from 'vitest';
import { AUTOFILL_ACCEPT, isSupportedAutofillFilename } from './autofillFilePolicy';

describe('Add Startup autofill file policy', () => {
  it('accepts PDF/PPTX and rejects legacy PPT for both picker and drag/drop', () => {
    expect(AUTOFILL_ACCEPT).toBe('.pdf,.pptx');
    expect(isSupportedAutofillFilename('deck.pdf')).toBe(true);
    expect(isSupportedAutofillFilename('DECK.PPTX')).toBe(true);
    expect(isSupportedAutofillFilename('deck.ppt')).toBe(false);
    expect(isSupportedAutofillFilename('deck.docx')).toBe(false);
  });
});
