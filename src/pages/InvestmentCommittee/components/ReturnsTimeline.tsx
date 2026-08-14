import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Undo2 } from 'lucide-react';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import { Muted, Panel, PanelHeader, SectionTitle } from './shared';

const ReturnRow = styled.div`
  border-left: 3px solid #ef4444;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export default function ReturnsTimeline({ meeting }: { meeting: InvestmentCommitteeMeeting }) {
  const { t } = useTranslation();
  const returns = meeting.returns || [];
  if (!returns.length) return null;

  return (
    <Panel>
      <PanelHeader>
        <SectionTitle>
          <Undo2 />
          {t('investmentCommittee.returns.title')}
        </SectionTitle>
      </PanelHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {returns.map((entry) => (
          <ReturnRow key={entry.id}>
            <strong>{entry.managerName || entry.byStep}</strong>
            {' · '}{(entry.createdAt || '').slice(0, 10)}
            {' — '}{entry.comment}
            <Muted as="span">
              {' '}({t(`investmentCommittee.stages.${entry.fromStage || 'draft'}`)} → {t(`investmentCommittee.stages.${entry.toStage || 'draft'}`)})
            </Muted>
          </ReturnRow>
        ))}
      </div>
    </Panel>
  );
}
