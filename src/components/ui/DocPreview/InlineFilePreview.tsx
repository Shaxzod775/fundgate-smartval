import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FileText } from 'lucide-react';
import { isLikelyPdf } from './DocPreview';

const Wrap = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => `${theme.colors.accent.primary}55`};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
  overflow: hidden;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  svg { width: 14px; height: 14px; color: ${({ theme }) => theme.colors.accent.primary}; flex-shrink: 0; }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Frame = styled.iframe`
  width: 100%;
  height: min(52vh, 520px);
  border: 0;
  display: block;
  background: #525659;
`;

export default function InlineFilePreview({ file, label }: { file: File | null; label?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isLikelyPdf(undefined, file.name)) {
      setUrl(null);
      return;
    }
    const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (!desktop) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url || !file) return null;

  return (
    <Wrap>
      <Head>
        <FileText />
        {label ? <span>{label}</span> : null}
        <strong title={file.name}>{file.name}</strong>
      </Head>
      <Frame src={url} title={file.name} />
    </Wrap>
  );
}
