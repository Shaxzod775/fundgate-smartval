import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const IGNORED = /(\.test\.tsx?|\/crmFileUrl\.ts)$/;

const files = Object.entries(sources).filter(([path]) => !IGNORED.test(path));

function offendingLines(pattern: RegExp): string[] {
  return files.flatMap(([path, source]) =>
    source
      .split('\n')
      .map((text, index) => ({ line: index + 1, text }))
      .filter(({ text }) => {
        const trimmed = text.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
        return pattern.test(text);
      })
      .map(({ line, text }) => `${path.replace('../', 'src/')}:${line} → ${text.trim()}`),
  );
}

describe('фронтенд CRM не отдаёт публичные ссылки на бакет', () => {
  it('находит исходники для проверки', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('нигде не собирает URL публичного бакета из пути', () => {
    expect(
      offendingLines(/['"`]https?:\/\/storage\.googleapis\.com|storage\.googleapis\.com\/\$\{|['"`]gs:\/\/\$\{/),
    ).toEqual([]);
  });

  it('не отдаёт приватный файл в сырой <img src>', () => {
    expect(
      offendingLines(/<img\b[^>]*\bsrc=\{[^}]*\.(avatar|logo|logoUrl|url|fileUrls)/),
    ).toEqual([]);
  });
});
