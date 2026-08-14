import { useCallback, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';
import { Bug, X, ImagePlus, Loader2, Check, Lightbulb } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { bugReportsApi, proposalsApi } from '../../services/api';

type FeedbackType = 'bug' | 'proposal';

const BUG_REPORT_MODAL_ATTR = 'data-bug-report-modal';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 3000;

export function floatingFeedbackBottom(avoidChatComposer: boolean, mobile = false): string {
  if (avoidChatComposer) return mobile ? '80px' : '88px';
  return mobile ? '16px' : '24px';
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SidebarButton = styled.button<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '20px')};
  padding-right: ${({ $isCollapsed }) => ($isCollapsed ? '0' : undefined)};
  color: ${({ theme }) => theme.colors.text.muted};
  background: transparent;
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: ${({ theme }) => theme.radius.lg};
  justify-content: ${({ $isCollapsed }) => ($isCollapsed ? 'center' : 'flex-start')};
  width: ${({ $isCollapsed }) => ($isCollapsed ? '100%' : 'calc(100% - 24px)')};
  margin: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '0 12px')};
  height: 44px;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    background: rgba(16, 185, 129, 0.08);
  }

  svg {
    width: 20px;
    height: 20px;
    min-width: 20px;
  }

  span {
    display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'block')};
    opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
    width: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 'auto')};
    overflow: hidden;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: ${({ $isCollapsed }) => ($isCollapsed ? 'translateX(10px)' : 'translateX(0)')};
  }
`;

const FloatingButton = styled.button<{ $avoidChatComposer: boolean }>`
  position: fixed;
  right: 24px;
  bottom: ${({ $avoidChatComposer }) => floatingFeedbackBottom($avoidChatComposer)};
  /* Must sit above every full-screen overlay so "report a bug" stays clickable
     even while a modal is open — shared Modal overlay is 1000, toasts 1100,
     nested panels 1200. */
  z-index: 1300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: #ffffff;
  padding: 0;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35), 0 0 0 4px rgba(22, 192, 143, 0.14);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, opacity 0.18s ease;

  /* Немодальные панели (комментарии заседания) занимают правый край и их
     композер попадает ровно под кнопку — прячемся, пока панель открыта.
     Модалки не в счёт: поверх них кнопка нужна (см. z-index выше). */
  body:has([data-floating-panel]) & {
    opacity: 0;
    pointer-events: none;
    transform: translateY(12px);
  }

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
  }

  @media (max-width: 768px) {
    right: 16px;
    bottom: ${({ $avoidChatComposer }) => floatingFeedbackBottom($avoidChatComposer, true)};
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  /* Above the shared Modal overlay (1000) and toasts (1100) so the bug-report
     modal — and its Cancel button — stay clickable while another modal is open. */
  z-index: 1200;
  animation: ${fadeIn} 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.shadows.xl};
  animation: ${slideUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 6px;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const Body = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 6px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }
`;

const CharCount = styled.div`
  margin-top: 4px;
  text-align: right;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ThumbRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Thumb = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ThumbRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
`;

const UploadButton = styled.label<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.input};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  font-size: 14px;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Hint = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 6px;
`;

const AutoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.mutedLight};
  padding: 6px 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const GhostBtn = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const PrimaryBtn = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: #0b0b0b;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
  }
`;

const TypeToggle = styled.div`
  display: flex;
  width: 100%;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  overflow: hidden;
`;

const TypeToggleBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? '#0b0b0b' : theme.colors.text.secondary};
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.accent.primaryHover : theme.colors.bg.tertiary};
  }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: 14px;
`;

const SuccessBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinIcon = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`;

interface FilePreview {
  file: File;
  previewUrl: string;
}

async function dataUrlToFile(dataUrl: string, fileName: string, fallbackType = 'image/jpeg'): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || fallbackType });
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function shouldCaptureNode(node: HTMLElement, omitMedia = false): boolean {
  if (node.closest?.(`[${BUG_REPORT_MODAL_ATTR}]`)) return false;
  const tag = node.tagName;
  if (tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'STYLE') return false;
  if (omitMedia && ['IMG', 'VIDEO', 'CANVAS', 'IFRAME'].includes(tag)) return false;
  return true;
}

interface FeedbackButtonProps {
  variant?: 'floating' | 'sidebar';
  isCollapsed?: boolean;
  avoidChatComposer?: boolean;
}

export const FeedbackButton = ({
  variant = 'floating',
  isCollapsed = false,
  avoidChatComposer = false,
}: FeedbackButtonProps) => {
  const { t } = useTranslation();
  const { manager } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [autoScreenshot, setAutoScreenshot] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runCapture = useCallback(async (): Promise<File | null> => {
    try {
      const { toBlob, toJpeg } = await import('html-to-image');
      const target = document.body;
      const main = document.querySelector('main') as HTMLElement | null;
      const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const baseOptions = {
        backgroundColor: '#0b0b0b',
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
        includeQueryParams: true,
        skipFonts: true,
        width: viewportWidth,
        height: viewportHeight,
        canvasWidth: viewportWidth,
        canvasHeight: viewportHeight,
        fetchRequestInit: { cache: 'force-cache' as RequestCache },
        onImageErrorHandler: () => undefined,
      };

      const attempts: Array<() => Promise<File | null>> = [
        async () => {
          const blob = await toBlob(target, {
            ...baseOptions,
            quality: 0.72,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
            filter: (node) => shouldCaptureNode(node),
          });
          if (!blob) return null;
          return new File([blob], `auto_${Date.now()}.png`, { type: blob.type || 'image/png' });
        },
        async () => {
          const dataUrl = await toJpeg(target, {
            ...baseOptions,
            quality: 0.62,
            pixelRatio: 1,
            filter: (node) => shouldCaptureNode(node, true),
          });
          if (!dataUrl || dataUrl === 'data:,') return null;
          return dataUrlToFile(dataUrl, `auto_${Date.now()}.jpg`, 'image/jpeg');
        },
        async () => {
          if (!main) return null;
          const blob = await toBlob(main, {
            ...baseOptions,
            quality: 0.62,
            pixelRatio: 1,
            filter: (node) => shouldCaptureNode(node, true),
          });
          if (!blob) return null;
          return new File([blob], `auto_${Date.now()}.png`, { type: blob.type || 'image/png' });
        },
      ];

      for (const attempt of attempts) {
        try {
          const file = await attempt();
          if (file && file.size > 0) return file;
        } catch (err) {
          console.warn('Auto screenshot attempt failed:', err);
        }
      }

      return null;
    } catch (err) {
      console.warn('Auto screenshot failed:', err);
      return null;
    }
  }, []);

  const captureAutoScreenshot = useCallback(async () => {
    setCapturing(true);
    setAutoScreenshot(null);
    try {
      const shot = await runCapture();
      setAutoScreenshot(shot);
    } finally {
      setCapturing(false);
    }
  }, [runCapture]);

  const openModal = useCallback(() => {
    setError(null);
    setSuccess(false);
    setIsOpen(true);
    requestAnimationFrame(() => {
      void captureAutoScreenshot();
    });
  }, [captureAutoScreenshot]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setType('bug');
    setDescription('');
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setAutoScreenshot(null);
    setError(null);
    setSuccess(false);
  }, [files]);

  const addImageFiles = useCallback((incomingFiles: File[]): boolean => {
    setError(null);
    const selected = incomingFiles.filter((file) => file.type.startsWith('image/'));
    if (!selected.length) return false;

    const remaining = MAX_IMAGES - files.length;
    if (selected.length > remaining) {
      setError(t('feedback.errorMaxFiles', { max: MAX_IMAGES }));
      return false;
    }

    const oversized = selected.find((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized) {
      setError(t('feedback.errorTooLarge'));
      return false;
    }

    const newPreviews: FilePreview[] = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...newPreviews]);
    return true;
  }, [files.length, t]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    addImageFiles(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    if (submitting) return;

    const pastedImages = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item, index) => {
        const file = item.getAsFile();
        if (!file) return null;

        return new File(
          [file],
          file.name || `pasted-screenshot-${Date.now()}-${index + 1}.png`,
          {
            type: file.type || 'image/png',
            lastModified: Date.now(),
          }
        );
      })
      .filter((file): file is File => Boolean(file));

    if (!pastedImages.length) return;

    e.preventDefault();
    addImageFiles(pastedImages);
  }, [addImageFiles, submitting]);

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError(t('feedback.errorEmpty'));
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      let shot = autoScreenshot;
      if (!shot) {
        shot = await runCapture();
        setAutoScreenshot(shot);
      }
      const userImages: File[] = files.map(({ file }) => file);

      const api = type === 'proposal' ? proposalsApi : bugReportsApi;
      const response = await api.create({
        description: description.trim(),
        userImages,
        autoScreenshot: shot,
        userEmail: manager?.email || manager?.login,
        userId: manager?.id,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });

      if (!response.success) {
        setError(response.message || response.error || t('feedback.errorSubmit'));
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
      setTimeout(closeModal, 1600);
    } catch (err) {
      console.error('Bug report submission failed:', err);
      setError(err instanceof Error ? err.message : t('feedback.errorSubmit'));
      setSubmitting(false);
    }
  };

  const label = t('feedback.buttonLabel');

  return (
    <>
      {variant === 'sidebar' ? (
        <SidebarButton $isCollapsed={isCollapsed} onClick={openModal} title={label}>
          <Bug />
          <span>{label}</span>
        </SidebarButton>
      ) : (
        !isOpen && (
          <FloatingButton
            type="button"
            onClick={openModal}
            title={label}
            aria-label={label}
            $avoidChatComposer={avoidChatComposer}
          >
            <Bug />
          </FloatingButton>
        )
      )}

      {isOpen && createPortal(
        <Overlay onClick={submitting ? undefined : closeModal} {...{ [BUG_REPORT_MODAL_ATTR]: '' }}>
          <ModalCard
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            {...{ [BUG_REPORT_MODAL_ATTR]: '' }}
          >
            <Header>
              <Title>{type === 'proposal' ? t('feedback.proposalTitle') : t('feedback.title')}</Title>
              <CloseBtn onClick={closeModal} disabled={submitting} aria-label={t('feedback.close')}>
                <X size={20} />
              </CloseBtn>
            </Header>

            {success ? (
              <SuccessBox>
                <Check size={48} color="#10b981" />
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t('feedback.successTitle')}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  {t('feedback.successSubtitle')}
                </div>
              </SuccessBox>
            ) : (
              <Body onPaste={handlePaste}>
                <TypeToggle role="tablist" aria-label={t('feedback.typeToggle')}>
                  <TypeToggleBtn
                    type="button"
                    $active={type === 'bug'}
                    onClick={() => setType('bug')}
                    disabled={submitting}
                    role="tab"
                    aria-selected={type === 'bug'}
                  >
                    <Bug size={14} /> {t('feedback.typeBug')}
                  </TypeToggleBtn>
                  <TypeToggleBtn
                    type="button"
                    $active={type === 'proposal'}
                    onClick={() => setType('proposal')}
                    disabled={submitting}
                    role="tab"
                    aria-selected={type === 'proposal'}
                  >
                    <Lightbulb size={14} /> {t('feedback.typeProposal')}
                  </TypeToggleBtn>
                </TypeToggle>
                <div>
                  <Label htmlFor="bug-description">{t('feedback.description')} *</Label>
                  <TextArea
                    id="bug-description"
                    autoFocus
                    placeholder={t('feedback.descriptionPlaceholder')}
                    value={description}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                  />
                  <CharCount>
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </CharCount>
                </div>

                <div>
                  <Label>
                    {t('feedback.screenshots')} ({files.length}/{MAX_IMAGES})
                  </Label>
                  {files.length > 0 && (
                    <ThumbRow style={{ marginBottom: 10 }}>
                      {files.map((f, idx) => (
                        <Thumb key={f.previewUrl}>
                          <img src={f.previewUrl} alt={`Screenshot ${idx + 1}`} />
                          <ThumbRemove
                            type="button"
                            onClick={() => removeFile(idx)}
                            disabled={submitting}
                            aria-label={t('feedback.remove')}
                          >
                            ×
                          </ThumbRemove>
                        </Thumb>
                      ))}
                    </ThumbRow>
                  )}

                  {files.length < MAX_IMAGES && (
                    <UploadButton $disabled={submitting}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        disabled={submitting}
                        style={{ display: 'none' }}
                      />
                      <ImagePlus size={16} />
                      {t('feedback.addScreenshot')}
                    </UploadButton>
                  )}
                  <Hint>{t('feedback.screenshotsHint', { max: MAX_IMAGES })}</Hint>
                  <Hint>{t('feedback.pasteHint')}</Hint>
                </div>

                <div>
                  <Label>{t('feedback.autoScreenshot')}</Label>
                  {capturing ? (
                    <AutoBadge>
                      <SpinIcon size={14} />
                      {t('feedback.autoScreenshotCapturing')}
                    </AutoBadge>
                  ) : autoScreenshot ? (
                    <AutoBadge>
                      <Check size={14} color="#10b981" />
                      {t('feedback.autoScreenshotAttached')}
                    </AutoBadge>
                  ) : (
                    <AutoBadge>{t('feedback.autoScreenshotFailed')}</AutoBadge>
                  )}
                </div>

                {error && <ErrorText>{error}</ErrorText>}

                <Actions>
                  <GhostBtn type="button" onClick={closeModal} disabled={submitting}>
                    {t('feedback.cancel')}
                  </GhostBtn>
                  <PrimaryBtn
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !description.trim()}
                  >
                    {submitting ? (
                      <>
                        <SpinIcon size={16} /> {t('feedback.submitting')}
                      </>
                    ) : (
                      t('feedback.submit')
                    )}
                  </PrimaryBtn>
                </Actions>
              </Body>
            )}
          </ModalCard>
        </Overlay>,
        document.body
      )}
    </>
  );
};

export default FeedbackButton;
