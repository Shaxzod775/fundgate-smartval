import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { X, Calendar, DollarSign, Users, Globe2, Mail, Phone, MapPin, MessageSquare, Send } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../contexts/AuthContext';
import { investorApplicationsApi, InvestorApplication } from '../../../services/api';
import { CrmImage } from '../../../components/ui/CrmImage';
import { formatShortDate, formatShortDateTime } from '../../../utils/formatDate';

const SheetOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 90;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;
`;

const SheetContainer = styled.div<{ $isOpen: boolean; $width: number }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${({ $width }) => $width}px;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-left: 1px solid ${({ theme }) => theme.colors.border.primary};
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
  z-index: 100;
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 640px) {
    width: 100vw;
    border-left: none;
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;

  &:hover,
  &:active {
    background: ${({ theme }) => theme.colors.accent.primary};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const SheetContent = styled.div`
  padding: 24px;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const IconButton = styled.button`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const SheetHeader = styled.div`
  margin-bottom: 24px;
`;

const HeaderContent = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  flex-shrink: 0;
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Subtitle = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const InfoCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 48px;
  min-width: 0;
`;

const InfoLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  flex: 1;
  min-width: 0;
`;

const BadgesSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
`;

const RequestText = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`;

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 24px;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 14px;
    top: 28px;
    bottom: -12px;
    width: 2px;
    background: ${({ theme }) => theme.colors.border.secondary};
  }
`;

const TimelineDot = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 2px solid ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ $color }) => $color};
  }
`;

const TimelineAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const TimelineContent = styled.div`
  flex: 1;
  padding-top: 2px;
`;

const TimelineText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
  line-height: 1.5;
`;

const TimelineDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const formatCheck = (value?: number): string => {
  if (!value) return '0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};

const parseFirestoreDate = (date: any): Date => {
  if (!date) return new Date();
  if (date._seconds !== undefined) return new Date(date._seconds * 1000);
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDate = (date: Date | string | { _seconds: number } | undefined, language: string): string => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'object' && '_seconds' in date) {
    d = new Date(date._seconds * 1000);
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }
  return formatShortDateTime(d, language);
};

interface InvestorDetailsSheetProps {
  application: InvestorApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (app: InvestorApplication) => void;
}

export const InvestorDetailsSheet = ({ application, isOpen, onClose, onUpdate }: InvestorDetailsSheetProps) => {
  const { t, i18n } = useTranslation();
  const { manager } = useAuth();
  const language = i18n.language;
  const [width, setWidth] = useState(560);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(560);

  const [cached, setCached] = useState<InvestorApplication | null>(application);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (application) setCached(application);
  }, [application]);

  const display = application || cached;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startXRef.current - e.clientX;
      setWidth(Math.min(Math.max(startWidthRef.current + delta, 400), window.innerWidth - 200));
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!display) return null;

  const buildTimeline = () => {
    const items: Array<{
      content: React.ReactNode;
      date: string;
      avatar?: string;
      createdAt: Date;
    }> = [];

    const activityLabel = (log: any) => {
      if (log.details) return log.details;
      const action = String(log.action || '');
      const key = `investorApplications.activity.${action}`;
      const translated = t(key);
      return translated === key ? action : translated;
    };

    if (display.activityLog && Array.isArray(display.activityLog)) {
      (display.activityLog as any[]).forEach((log: any) => {
        const logDate = log.createdAt?._seconds
          ? new Date(log.createdAt._seconds * 1000)
          : new Date(log.createdAt || new Date());

        items.push({
          content: (
            <>
              {log.managerName && (
                <><span style={{ color: '#fff', fontWeight: 600 }}>{log.managerName}</span>{' '}</>
              )}
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{activityLabel(log)}</span>
            </>
          ),
          date: formatDate(log.createdAt, language),
          avatar: log.managerAvatar,
          createdAt: logDate,
        });
      });
    }

    if (display.comments && Array.isArray(display.comments)) {
      (display.comments as any[]).forEach((comment: any) => {
        const commentDate = comment.createdAt?._seconds
          ? new Date(comment.createdAt._seconds * 1000)
          : new Date(comment.createdAt || new Date());

        items.push({
          content: (
            <>
              <span style={{ color: '#fff', fontWeight: 600 }}>{comment.managerName || t('common.manager')}</span>{' '}
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('investorApplications.commented')}:</span>
              <div style={{ marginTop: 6, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontSize: '14px' }}>
                "{comment.text}"
              </div>
            </>
          ),
          date: formatDate(comment.createdAt, language),
          avatar: comment.managerAvatar,
          createdAt: commentDate,
        });
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  };

  const timeline = buildTimeline();

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !manager || isSubmitting || !display) return;
    setIsSubmitting(true);
    try {
      const response = await investorApplicationsApi.addComment(display.id, {
        managerId: manager.id,
        managerName: manager.name,
        text: commentText.trim(),
      });

      if (response.success && onUpdate && application) {
        const newComment = { id: Date.now().toString(), managerId: manager.id, managerName: manager.name, text: commentText.trim(), createdAt: new Date() };
        onUpdate({
          ...application,
          comments: [...(application.comments as any[] || []), newComment],
        });
        setCommentText('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createdAt = parseFirestoreDate(display.createdAt);
  const sourceLabel = (source?: string) => {
    const normalized = String(source || '').toLowerCase();
    if (normalized === 'manual') return t('investorApplications.source.manual');
    if (normalized === 'platform') return t('investorApplications.source.platform');
    return source || t('common.notSpecified');
  };

  const sheetContent = (
    <>
      <SheetOverlay $isOpen={isOpen} onClick={onClose} />
      <SheetContainer $isOpen={isOpen} $width={width}>
        <ResizeHandle onMouseDown={handleMouseDown} />
        <SheetContent>
          <ActionButtons>
            <IconButton onClick={onClose} title={t('common.close')}>
              <X size={16} />
            </IconButton>
          </ActionButtons>

          <SheetHeader>
            <HeaderContent>
              <Logo>{display.fundName?.charAt(0)?.toUpperCase() || 'I'}</Logo>
              <TitleGroup>
                <Title>{display.fundName}</Title>
                <Subtitle><Mail /> {display.email}</Subtitle>
                {display.phone && <Subtitle><Phone /> {display.phone}</Subtitle>}
              </TitleGroup>
            </HeaderContent>
          </SheetHeader>

          {display.request && (
            <Section>
              <SectionTitle>{t('investorApplications.fields.request')}</SectionTitle>
              <RequestText>{display.request}</RequestText>
            </Section>
          )}

          <Section>
            <Grid>
              {display.country && (
                <InfoCard>
                  <InfoLabel><MapPin /> {t('investorApplications.fields.country')}</InfoLabel>
                  <InfoValue>{display.country}</InfoValue>
                </InfoCard>
              )}
              {(display.checkFrom || display.checkTo) && (
                <InfoCard>
                  <InfoLabel><DollarSign /> {t('investorApplications.fields.checkRange')}</InfoLabel>
                  <InfoValue>{formatCheck(display.checkFrom)} – {formatCheck(display.checkTo)}</InfoValue>
                </InfoCard>
              )}
              <InfoCard>
                <InfoLabel><Globe2 /> {t('investorApplications.fields.source')}</InfoLabel>
                <InfoValue>{sourceLabel(display.source)}</InfoValue>
              </InfoCard>
              <InfoCard>
                <InfoLabel><Calendar /> {t('investorApplications.fields.date')}</InfoLabel>
                <InfoValue>{formatShortDate(createdAt, language)}</InfoValue>
              </InfoCard>
            </Grid>
          </Section>

          {display.stages?.length > 0 && (
            <Section>
              <SectionTitle>{t('investorApplications.fields.stages')}</SectionTitle>
              <BadgesSection>
                {display.stages.map((stage) => (
                  <Badge key={stage} variant="info">{stage}</Badge>
                ))}
              </BadgesSection>
            </Section>
          )}

          {display.industries?.length > 0 && (
            <Section>
              <SectionTitle>{t('investorApplications.fields.industries')}</SectionTitle>
              <BadgesSection>
                {display.industries.map((ind) => (
                  <Badge key={ind} variant="neutral">{ind}</Badge>
                ))}
              </BadgesSection>
            </Section>
          )}

          {display.assignedManager && (
            <Section>
              <SectionTitle>{t('investorApplications.fields.manager')}</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', width: 'fit-content' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #10b981', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {display.assignedManager.avatar ? (
                    <CrmImage src={display.assignedManager.avatar} alt={display.assignedManager.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Users size={14} style={{ color: '#666' }} />
                  )}
                </div>
                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 500 }}>{display.assignedManager.name}</span>
              </div>
            </Section>
          )}

          <Section>
            <SectionTitle>{t('investorApplications.timeline')}</SectionTitle>
            <TimelineContainer>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MessageSquare size={14} color="white" />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <textarea
                      placeholder={t('investorApplications.commentPlaceholder')}
                      rows={1}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit();
                        }
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '14px', resize: 'none', outline: 'none' }}
                    />
                  </div>
                  {commentText.trim() && (
                    <button
                      onClick={handleCommentSubmit}
                      disabled={isSubmitting}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Send size={14} color="white" />
                    </button>
                  )}
                </div>
              </div>

              {timeline.length > 0 ? (
                timeline.map((item, index) => (
                  <TimelineItem key={index}>
                    {item.avatar ? (
                      <TimelineAvatar src={item.avatar} alt={t('investorApplications.fields.manager')} style={{ zIndex: 2, border: '2px solid #1f2937' }} />
                    ) : (
                      <TimelineDot $color="#10b981" />
                    )}
                    <TimelineContent>
                      <TimelineText>{item.content}</TimelineText>
                      <TimelineDate>{item.date}</TimelineDate>
                    </TimelineContent>
                  </TimelineItem>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px', padding: '20px 0' }}>
                  {t('investorApplications.noActivity')}
                </div>
              )}
            </TimelineContainer>
          </Section>
        </SheetContent>
      </SheetContainer>
    </>
  );

  return createPortal(sheetContent, document.body);
};
