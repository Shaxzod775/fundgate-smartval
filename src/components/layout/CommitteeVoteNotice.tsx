import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { investmentCommitteeApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COMMITTEE_ATTENTION_ROLES, meetingsAwaitingAction } from '../../pages/InvestmentCommittee/awaitingActions';
import TopToast from '../ui/TopToast/TopToast';

const SESSION_KEY = 'ic-action-notice-shown';

export default function CommitteeVoteNotice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { manager, organization } = useAuth();
  const organizationId = organization?.id || manager?.organizationId || '';
  const [awaitingTitles, setAwaitingTitles] = useState<string[] | null>(null);

  const role = manager?.role || '';
  const isMember = role === 'committee_member';

  useEffect(() => {
    if (!COMMITTEE_ATTENTION_ROLES.has(role) || !manager?.id || !organizationId) return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    let active = true;
    investmentCommitteeApi.getCommittees(organizationId).then((response) => {
      if (!active || !response.success) return;
      const awaiting = meetingsAwaitingAction(response.data || [], manager.id, role);
      if (!awaiting.length) return;
      window.sessionStorage.setItem(SESSION_KEY, '1');
      setAwaitingTitles(awaiting.map((meeting) => meeting.title || meeting.id));
    });
    return () => { active = false; };
  }, [role, manager?.id, organizationId]);

  if (!awaitingTitles?.length) return null;

  return (
    <TopToast
      tone="info"
      title={isMember
        ? t('investmentCommittee.voteReminder.title', 'Ждут вашего голоса')
        : t('investmentCommittee.decisionReminder.title', 'Ждётся ваше решение')}
      message={isMember
        ? t('investmentCommittee.voteReminder.message', 'Эти инвест-комитеты ждут вашего голоса: {{titles}}', { titles: awaitingTitles.join(', ') })
        : t('investmentCommittee.decisionReminder.message', 'Сейчас в Инвесткомитете ждётся ваше решение: {{titles}}', { titles: awaitingTitles.join(', ') })}
      autoHideMs={8000}
      onClose={() => setAwaitingTitles(null)}
      onClick={() => navigate('/committee/sessions')}
    />
  );
}
