import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';
import { Check, Download, ExternalLink, FileWarning, Loader2, X } from 'lucide-react';
import { downloadCrmFile, normalizeCrmFileUrl, openCrmFile, resolveCrmFileUrl } from '../../../services/api';

const DESKTOP_QUERY = '(min-width: 1024px)';

function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;
}

function fileSources(url?: string | null, fileName?: string): string[] {
  const sources = [(fileName || url || '').split(/[?#]/)[0]];
  const marker = '/crm/files/';
  const idx = (url || '').indexOf(marker);
  if (idx !== -1) {
    try {
      const seg = (url as string).slice(idx + marker.length).split(/[?#/]/)[0];
      sources.push(atob(seg.replace(/-/g, '+').replace(/_/g, '/')).split(/[?#]/)[0]);
    } catch {
    }
  }
  return sources;
}

export function isLikelyPdf(url?: string | null, fileName?: string): boolean {
  return fileSources(url, fileName).some((source) => /\.pdf$/i.test(source));
}

export function isOfficeDoc(url?: string | null, fileName?: string): boolean {
  return fileSources(url, fileName).some((source) => /\.(docx?|xlsx?|pptx?)$/i.test(source));
}

export function isLikelyHtml(url?: string | null, fileName?: string): boolean {
  return fileSources(url, fileName).some((source) => /\.html?$/i.test(source));
}

export interface DocPreviewOptions {
  onConfirm?: () => void;
  confirmLabel?: string;
  onClose?: () => void;
}

let hostOpen: ((url: string, fileName?: string, options?: DocPreviewOptions) => void) | null = null;

export function previewDocument(
  url?: string | null,
  fileName?: string,
  startupId?: string | null,
): void {
  if (!url) return;
  if (isDesktop() && hostOpen && (isLikelyPdf(url, fileName) || isLikelyHtml(url, fileName) || isOfficeDoc(url, fileName))) {
    hostOpen(normalizeCrmFileUrl(url, startupId), fileName);
  } else {
    void openCrmFile(url, startupId);
  }
}

export function openDocPreview(url: string, fileName?: string, options?: DocPreviewOptions): boolean {
  if (!hostOpen) return false;
  hostOpen(normalizeCrmFileUrl(url), fileName, options);
  return true;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  background: rgba(0, 0, 0, 0.6);
  animation: ${fadeIn} 160ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Panel = styled.div`
  width: min(1100px, 92vw);
  height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  overflow: hidden;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const Name = styled.strong`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeadActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  cursor: pointer;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; color: ${({ theme }) => theme.colors.text.primary}; }
  svg { width: 15px; height: 15px; }
`;

const ConfirmButton = styled(IconButton)`
  border-color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primary};
  color: #fff;

  &:hover { color: #fff; opacity: 0.92; }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  background: #525659; /* нейтральный фон читалки PDF */
`;

const Frame = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
`;

const Hint = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const HintAction = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.colors.accent.primary};
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;

  &:hover { opacity: 0.85; }
`;

const Centered = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.card};

  svg { width: 28px; height: 28px; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.9s linear infinite;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

interface PreviewState {
  url: string;
  fileName?: string;
  options?: DocPreviewOptions;
}

export function DocPreviewHost() {
  const { t } = useTranslation();
  const [state, setState] = useState<PreviewState | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    hostOpen = (url, fileName, options) => {
      setResolved(null);
      setError(false);
      setState({ url, fileName, options });
    };
    return () => { hostOpen = null; };
  }, []);

  const revokeBlob = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  };

  const clear = () => {
    revokeBlob();
    setState(null);
    setResolved(null);
    setError(false);
  };

  const close = () => {
    state?.options?.onClose?.();
    clear();
  };

  const confirm = () => {
    state?.options?.onConfirm?.();
    clear();
  };

  const unpreviewable = Boolean(
    state
    && isOfficeDoc(state.url, state.fileName)
    && !isLikelyPdf(state.url, state.fileName),
  );

  useEffect(() => {
    if (!state || unpreviewable) return;
    let active = true;
    resolveCrmFileUrl(state.url).then((url) => {
      if (!active) return;
      if (!url) { setError(true); return; }
      if (url.startsWith('blob:')) blobRef.current = url;
      setResolved(url);
    });
    return () => { active = false; };
  }, [state, unpreviewable]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => revokeBlob, []);

  if (!state) return null;

  return createPortal(
    <Overlay onClick={close} role="dialog" aria-modal="true" data-floating-panel="doc-preview">
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <Name title={state.fileName || state.url}>{state.fileName || 'PDF'}</Name>
          <HeadActions>
            {state.url.startsWith('blob:') ? null : (
              <IconButton type="button" onClick={() => { void openCrmFile(state.url); }}>
                <ExternalLink />
                {t('common.open', 'Open')}
              </IconButton>
            )}
            <IconButton type="button" aria-label={t('common.close', 'Close')} onClick={close}>
              <X />
            </IconButton>
            {state.options?.onConfirm ? (
              <ConfirmButton type="button" onClick={confirm}>
                <Check />
                {state.options.confirmLabel || t('common.continue', 'Continue')}
              </ConfirmButton>
            ) : null}
          </HeadActions>
        </Head>
        <Body>
          {unpreviewable ? (
            <Centered>
              <FileWarning />
              <span>
                {t(
                  'docPreview.officeUnsupported',
                  'A Word document cannot be shown here — download it or open it in a new tab.',
                )}
              </span>
              <IconButton type="button" onClick={() => { void downloadCrmFile(state.url, state.fileName); }}>
                <Download />{t('docPreview.download', 'Download')}
              </IconButton>
              <IconButton type="button" onClick={() => { void openCrmFile(state.url); }}>
                <ExternalLink />{t('docPreview.openInNewTab', 'Open in a new tab')}
              </IconButton>
            </Centered>
          ) : error ? (
            <Centered>
              <FileWarning />
              <span>{t('docPreview.loadError', 'Could not open the file — no access or the token has expired.')}</span>
              <IconButton type="button" onClick={() => { void openCrmFile(state.url); }}>
                <ExternalLink />{t('docPreview.openInNewTab', 'Open in a new tab')}
              </IconButton>
            </Centered>
          ) : !resolved ? (
            <Centered><Spinner /></Centered>
          ) : (
            <Frame src={resolved} title={state.fileName || t('docPreview.frameTitle', 'PDF preview')} />
          )}
        </Body>
        {unpreviewable || error ? null : (
          <Hint>
            <span>{t('docPreview.notShowing', 'Документ не отображается?')}</span>
            {state.url.startsWith('blob:') ? null : (
              <HintAction type="button" onClick={() => { void openCrmFile(state.url); }}>
                {t('docPreview.openInNewTab', 'Открыть в новой вкладке')}
              </HintAction>
            )}
            <HintAction type="button" onClick={() => { void downloadCrmFile(state.url, state.fileName); }}>
              {t('docPreview.download', 'Скачать')}
            </HintAction>
          </Hint>
        )}
      </Panel>
    </Overlay>,
    document.body,
  );
}
