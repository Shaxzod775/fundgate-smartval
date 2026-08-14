import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal/Modal';
import { managerApi, type Startup } from '../../services/api';
import { formatStartupStatusLabel } from '../../utils/startupStatusDisplay';

export interface HonorBoardManager {
  id: string;
  name: string;
  avatar?: string;
  deals: number;
  projects: number;
  volume: number;
}

interface Props {
  manager: HonorBoardManager | null;
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_STATUSES = ['pipeline', 'in_review', 'new'];

const startupName = (s: Startup): string =>
  s.brief?.name || ((s as any).formData?.stepA?.name as string) || '—';

const dealVolume = (s: Startup): number => Number((s as any).investmentAmount) || 0;

const formatVolume = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v || 0}`;
};

const spin = keyframes`to { transform: rotate(360deg); }`;

const Section = styled.div`
  & + & {
    margin-top: ${({ theme }) => theme.spacing[6]};
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background 0.15s;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.bg.secondary};
    outline: none;
  }
`;

const RowName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowVolume = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  flex: 0 0 auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 2px 8px;
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const ManagerDealsModal: React.FC<Props> = ({ manager, isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [startups, setStartups] = useState<Startup[]>([]);

  useEffect(() => {
    if (!isOpen || !manager?.id || manager.id.startsWith('mgr-')) {
      setStartups([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setStartups([]);
    managerApi
      .getStartups(manager.id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) setStartups(res.data);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, manager?.id]);

  if (!manager) return null;

  const deals = startups.filter((s) => s.status === 'portfolio');
  const projects = startups.filter((s) => PROJECT_STATUSES.includes(s.status));

  const open = (id: string) => {
    onClose();
    navigate(`/startups/${id}`);
  };

  const rowKeyDown = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(id);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={manager.name} width="640px">
      {loading ? (
        <LoadingWrap>
          <Loader2 size={24} />
        </LoadingWrap>
      ) : error ? (
        <Empty>{t('dashboard.managerModal.error')}</Empty>
      ) : (
        <>
          <Section>
            <SectionTitle>
              {t('dashboard.managerModal.deals')} · {deals.length}
            </SectionTitle>
            {deals.length === 0 ? (
              <Empty>{t('dashboard.managerModal.emptyDeals')}</Empty>
            ) : (
              <RowList>
                {deals.map((s) => (
                  <Row
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => open(s.id)}
                    onKeyDown={rowKeyDown(s.id)}
                  >
                    <RowName>{startupName(s)}</RowName>
                    <RowVolume>{formatVolume(dealVolume(s))}</RowVolume>
                  </Row>
                ))}
              </RowList>
            )}
          </Section>

          <Section>
            <SectionTitle>
              {t('dashboard.managerModal.projects')} · {projects.length}
            </SectionTitle>
            {projects.length === 0 ? (
              <Empty>{t('dashboard.managerModal.emptyProjects')}</Empty>
            ) : (
              <RowList>
                {projects.map((s) => (
                  <Row
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => open(s.id)}
                    onKeyDown={rowKeyDown(s.id)}
                  >
                    <RowName>{startupName(s)}</RowName>
                    <StatusBadge>{formatStartupStatusLabel(s.status, t)}</StatusBadge>
                  </Row>
                ))}
              </RowList>
            )}
          </Section>
        </>
      )}
    </Modal>
  );
};

export default ManagerDealsModal;
