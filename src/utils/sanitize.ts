import DOMPurify from 'dompurify';

const RICH_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'b', 'i', 'em', 'strong', 'u',
    'p', 'br', 'span', 'div',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
  ADD_ATTR: ['target', 'rel'],
};

const INLINE_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'span', 'br', 'code'],
  ALLOWED_ATTR: ['class'],
};

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, RICH_CONFIG) as unknown as string;
}

export function sanitizeInline(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, INLINE_CONFIG) as unknown as string;
}
