import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DollarSign, MoreHorizontal, Calendar, Trash2, User, Mail, MapPin } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { InvestorApplication } from '../../../services/api';
import { CrmImage } from '../../../components/ui/CrmImage';
import { formatDayMonth } from '../../../utils/formatDate';

const CardContainer = styled.div`
  /* Fill the column instead of a fixed 420px: the column is 420px but its padding
     makes the inner area narrower, so a fixed-420px card overflowed and got clipped
     by ColumnCards' overflow-x: hidden — that was the "обрубленный" right edge. */
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  will-change: transform;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

    .actions-btn {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const CardHeader = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const Logo = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const LogoFallback = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  text-transform: uppercase;
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FundName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ContactInfo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const BadgesRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const CheckRange = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
  margin-bottom: 8px;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.status.success};
  }
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  min-width: 0;
`;

const MetaGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
  overflow: hidden;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SourceBadge = styled.span<{ $source: string }>`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $source }) =>
    $source === 'Platform' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
  color: ${({ $source }) =>
    $source === 'Platform' ? '#818cf8' : '#fbbf24'};
`;

const ActionsButton = styled.button<{ $active?: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  /* Кнопка «⋯» проявляется только при наведении на карточку (см. CardContainer). */
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.2s;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  z-index: 10;

  &:hover,
  &:focus-visible {
    opacity: 1;
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* На тач-устройствах hover не бывает — там кнопка видна всегда. */
  @media (hover: none) {
    opacity: 1;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 36px;
  right: ${({ theme }) => theme.spacing[3]};
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  min-width: 180px;
  z-index: 100;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-8px)')};
  transition: all 0.15s ease;
  overflow: hidden;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  color: ${({ theme, $danger }) => $danger ? theme.colors.status.danger : theme.colors.text.primary};
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme, $danger }) => $danger ? theme.colors.status.danger : theme.colors.text.muted};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const AssignedManager = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ManagerAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1.5px solid ${({ theme }) => theme.colors.accent.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 12px;
    height: 12px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ManagerName = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const formatCheck = (value?: number): string => {
  if (!value) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
};

const parseFirestoreDate = (date: any): Date => {
  if (!date) return new Date();
  if (date._seconds !== undefined) return new Date(date._seconds * 1000);
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface InvestorCardProps {
  application: InvestorApplication;
  onClick: (id: string) => void;
  onDelete?: (application: InvestorApplication) => void;
}

export const InvestorCard = ({ application, onClick, onDelete }: InvestorCardProps) => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const language = i18n.language;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(application);
  };

  const createdAt = parseFirestoreDate(application.createdAt);
  const sourceLabel = (source?: string) => {
    const normalized = String(source || '').toLowerCase();
    if (normalized === 'manual') return t('investorApplications.source.manual');
    if (normalized === 'platform') return t('investorApplications.source.platform');
    return source || t('common.notSpecified');
  };

  return (
    <CardContainer onClick={() => onClick(application.id)}>
      <div ref={menuRef}>
        <ActionsButton className="actions-btn" $active={isMenuOpen} onClick={handleMenuClick}>
          <MoreHorizontal size={16} />
        </ActionsButton>
        <DropdownMenu $isOpen={isMenuOpen}>
          <DropdownItem $danger onClick={handleDelete}>
            <Trash2 />
            {t('common.delete')}
          </DropdownItem>
        </DropdownMenu>
      </div>

      <CardHeader>
        <Logo>
          <LogoFallback>{(application.fundName || application.email)?.charAt(0)?.toUpperCase() || 'I'}</LogoFallback>
        </Logo>
        <CardInfo>
          <FundName>{application.fundName || t('investorApplications.unnamed', 'Unnamed investor')}</FundName>
          <ContactInfo>
            <Mail /> {application.email || '—'}
          </ContactInfo>
        </CardInfo>
      </CardHeader>

      {(application.checkFrom || application.checkTo) && (
        <CheckRange>
          <DollarSign />
          ${formatCheck(application.checkFrom)} – ${formatCheck(application.checkTo)}
        </CheckRange>
      )}

      <BadgesRow>
        {application.stages?.slice(0, 3).map((stage) => (
          <Badge key={stage} variant="info">
            {stage}
          </Badge>
        ))}
        {application.industries?.slice(0, 2).map((ind) => (
          <Badge key={ind} variant="neutral">
            {ind}
          </Badge>
        ))}
      </BadgesRow>

      <CardMeta>
        <MetaGroup>
          {application.country && (
            <MetaItem>
              <MapPin />
              {application.country}
            </MetaItem>
          )}
          <MetaItem>
            <Calendar />
            {formatDayMonth(createdAt, language)}
          </MetaItem>
        </MetaGroup>
        <SourceBadge $source={application.source}>
          {sourceLabel(application.source)}
        </SourceBadge>
      </CardMeta>

      {application.assignedManager && (
        <AssignedManager>
          <ManagerAvatar>
            {application.assignedManager.avatar ? (
              <CrmImage src={application.assignedManager.avatar} alt={application.assignedManager.name} />
            ) : (
              <User />
            )}
          </ManagerAvatar>
          <ManagerName>{application.assignedManager.name}</ManagerName>
        </AssignedManager>
      )}
    </CardContainer>
  );
};
