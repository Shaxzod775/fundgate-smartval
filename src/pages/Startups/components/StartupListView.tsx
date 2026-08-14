import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Startup, StartupStatus } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { ChevronDown, UserCog } from 'lucide-react';
import { formatSmartValValuation } from '../../../utils/smartValValuation';
import { CrmImage } from '../../../components/ui/CrmImage';
import { formatShortDate } from '../../../utils/formatDate';

const stageTranslationKeys: Record<string, string> = {
  'Идея': 'startupDetail.sheet.stages.idea',
  MVP: 'startupDetail.sheet.stages.mvp',
  'MVP готов': 'startupDetail.sheet.stages.mvpReady',
  'MVP ready': 'startupDetail.sheet.stages.mvpReady',
  Прототип: 'startupDetail.sheet.stages.prototype',
  Prototype: 'startupDetail.sheet.stages.prototype',
  'Есть первые клиенты': 'startupDetail.sheet.stages.firstCustomers',
  'First customers': 'startupDetail.sheet.stages.firstCustomers',
  'Растущий бизнес': 'startupDetail.sheet.stages.growthBusiness',
  'Growing business': 'startupDetail.sheet.stages.growthBusiness',
  'Pre-Seed': 'startupDetail.sheet.stages.preSeed',
  Seed: 'startupDetail.sheet.stages.seed',
  'Series A': 'startupDetail.sheet.stages.roundA',
  'Series B': 'startupDetail.sheet.stages.roundB',
  'Series C': 'startupDetail.sheet.stages.roundC',
};

const TableContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: visible;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Tr = styled.tr`
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: visible;
  position: relative;
`;

const CompanyCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CompanyName = styled.div`
  font-weight: 600;
`;

const CompanyIndustry = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ManagerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const ManagerAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const ScoreText = styled.span<{ $tone?: 'pending' | 'failed' | 'success' | 'warning' }>`
  font-weight: 600;
  color: ${({ $tone }) => {
    if ($tone === 'pending') return '#38bdf8';
    if ($tone === 'failed') return '#ef4444';
    if ($tone === 'success') return '#10b981';
    return '#f59e0b';
  }};
`;

const StatusDropdownWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const StatusTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const StatusMenuPortal = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 9999;
  min-width: 160px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 4px;
`;

const StatusOption = styled.button<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: ${({ $isActive }) => ($isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent')};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const allStatuses: StartupStatus[] = ['new', 'in_review', 'pipeline', 'portfolio', 'rejected'];

interface StatusDropdownProps {
  startup: Startup;
  getStatusVariant: (status: StartupStatus) => 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  onStatusChange?: (startupId: string, newStatus: StartupStatus) => void;
}

const StatusDropdown = ({ startup, getStatusVariant, onStatusChange }: StatusDropdownProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 220; // approximate menu height
    const top = spaceBelow < menuHeight
      ? rect.top - menuHeight
      : rect.bottom + 4;
    setMenuPos({ top, left: rect.left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  if (!onStatusChange) {
    return (
      <StatusDropdownWrapper>
        <Badge variant={getStatusVariant(startup.status)}>
          {t(`startups.status.${startup.status}`)}
        </Badge>
      </StatusDropdownWrapper>
    );
  }

  return (
    <StatusDropdownWrapper>
      <StatusTrigger ref={triggerRef} onClick={handleOpen}>
        <Badge variant={getStatusVariant(startup.status)}>
          {t(`startups.status.${startup.status}`)}
        </Badge>
        <ChevronDown />
      </StatusTrigger>
      {isOpen && createPortal(
        <StatusMenuPortal ref={menuRef} $top={menuPos.top} $left={menuPos.left}>
          {allStatuses.map((status) => (
            <StatusOption
              key={status}
              $isActive={startup.status === status}
              onClick={(e) => {
                e.stopPropagation();
                if (status !== startup.status && onStatusChange) {
                  onStatusChange(startup.id, status);
                }
                setIsOpen(false);
              }}
            >
              <Badge variant={getStatusVariant(status)}>
                {t(`startups.status.${status}`)}
              </Badge>
            </StatusOption>
          ))}
        </StatusMenuPortal>,
        document.body
      )}
    </StatusDropdownWrapper>
  );
};


const ReassignButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.muted};
  transition: all 0.2s;
  display: flex;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

function getNameInitial(name?: string): string {
  const firstChar = Array.from((name || '').trim())[0];
  return firstChar ? firstChar.toUpperCase() : '?';
}

function ManagerAvatarDisplay({ name, avatar }: { name: string; avatar?: string }) {
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const shouldShowAvatar = Boolean(avatar) && !hasAvatarError;

  return (
    <ManagerAvatar aria-label={name}>
      {shouldShowAvatar ? (
        <CrmImage src={avatar} alt={name} onError={() => setHasAvatarError(true)} />
      ) : (
        getNameInitial(name)
      )}
    </ManagerAvatar>
  );
}

interface StartupRowProps {
    startup: Startup;
    onClick: (id: string) => void;
    getStatusVariant: (status: StartupStatus) => 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    onStatusChange?: (startupId: string, newStatus: StartupStatus) => void;
    onReassignManager?: (startup: Startup) => void;
}

const StartupRow = ({ startup, onClick, getStatusVariant, onStatusChange, onReassignManager }: StartupRowProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language;
    const logoSrc = startup.logo || startup.fileUrls?.logo;
    const analysisStatus = startup.analysisStatus;
    const isAnalysisPending = analysisStatus === 'queued' || analysisStatus === 'processing';
    const isAnalysisFailed = analysisStatus === 'failed';
    const isAnalysisBlocked = analysisStatus === 'blocked';
    const visibleScore = startup.aiAnalysis?.score ?? startup.score;
    const stageLabel = stageTranslationKeys[startup.brief.stage]
        ? t(stageTranslationKeys[startup.brief.stage])
        : startup.brief.stage;

    return (
        <Tr onClick={() => onClick(startup.id)}>
            <Td>
                <CompanyCell>
                    <StartupLogo
                        variant="sm"
                        src={logoSrc}
                        startupId={startup.id}
                        name={startup.brief?.companyName || ''}
                    />
                    <div>
                        <CompanyName>{startup.brief.companyName}</CompanyName>
                        <CompanyIndustry>{startup.brief.industry}</CompanyIndustry>
                    </div>
                </CompanyCell>
            </Td>
            <Td>{stageLabel}</Td>
            <Td>
                <StatusDropdown
                    startup={startup}
                    getStatusVariant={getStatusVariant}
                    onStatusChange={onStatusChange}
                />
            </Td>
            <Td>
                {isAnalysisPending ? (
                    <ScoreText $tone="pending">{t('startups.card.analysisPending')}</ScoreText>
                ) : isAnalysisFailed ? (
                    <ScoreText $tone="failed">{t('common.error')}</ScoreText>
                ) : isAnalysisBlocked ? (
                    <ScoreText $tone="failed" title={startup.analysisError || undefined}>{t('startups.card.blocked', 'Spam / Blocked')}</ScoreText>
                ) : typeof visibleScore === 'number' ? (
                    <ScoreText $tone={visibleScore > 70 ? 'success' : 'warning'}>
                        {visibleScore}
                    </ScoreText>
                ) : '-'}
            </Td>
            <Td>
                {formatSmartValValuation(
                    startup.smartValDetails,
                    { final_valuation: startup.aiAnalysis?.valuation }
                ) || '-'}
            </Td>
            <Td>
                <ManagerCell>
                  {startup.assignedManager ? (
                    <>
                      <ManagerAvatarDisplay
                        name={startup.assignedManager.name}
                        avatar={startup.assignedManager.avatar}
                      />
                      {startup.assignedManager.name.split(' ')[0]}
                    </>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>{t('startups.unassigned')}</span>
                  )}
                  {onReassignManager && (
                    <ReassignButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onReassignManager(startup);
                      }}
                      title={t('startups.changeManager')}
                    >
                      <UserCog size={14} />
                    </ReassignButton>
                  )}
                </ManagerCell>
            </Td>
            <Td>
                {formatShortDate(new Date(startup.createdAt), language)}
            </Td>
        </Tr>
    );
};

interface StartupListViewProps {
    startups: Startup[];
    onClick: (id: string) => void;
    getStatusVariant: (status: StartupStatus) => 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    onStatusChange?: (startupId: string, newStatus: StartupStatus) => void;
    onReassignManager?: (startup: Startup) => void;
}

export const StartupListView = ({ startups, onClick, getStatusVariant, onStatusChange, onReassignManager }: StartupListViewProps) => {
    const { t } = useTranslation();
    return (
        <TableContainer>
            <Table>
                <thead>
                    <tr>
                        <Th>{t('startups.list.companyIndustry')}</Th>
                        <Th>{t('startups.list.stage')}</Th>
                        <Th>{t('startups.list.status')}</Th>
                        <Th>{t('startups.list.score')}</Th>
                        <Th>{t('startups.list.valuation')}</Th>
                        <Th>{t('startups.list.manager')}</Th>
                        <Th>{t('startups.list.applied')}</Th>
                    </tr>
                </thead>
                <tbody>
                    {startups.map((startup) => (
                        <StartupRow
                            key={startup.id}
                            startup={startup}
                            onClick={onClick}
                            getStatusVariant={getStatusVariant}
                            onStatusChange={onStatusChange}
                            onReassignManager={onReassignManager}
                        />
                    ))}
                </tbody>
            </Table>
        </TableContainer>
    );
};
