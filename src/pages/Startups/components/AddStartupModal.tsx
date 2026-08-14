import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { StepIndicator } from './AddStartupWizard/StepIndicator';
import { StepA } from './AddStartupWizard/StepA';
import { StepB } from './AddStartupWizard/StepB';
import { StepC } from './AddStartupWizard/StepC';
import { MVP_PLUS_STAGES, STAGE_TO_CRM } from './AddStartupWizard/constants';
import { mapDraftToWizard } from './AddStartupWizard/autofillMapping';
import { AUTOFILL_ACCEPT, isSupportedAutofillFilename } from './AddStartupWizard/autofillFilePolicy';
import { startupsApi } from '../../../services/api';
import {
  WizardFormData,
  StepAData,
  StepBData,
  StepCData,
  CrmData,
  initialStepA,
  initialStepB,
  initialStepC,
  initialCrm,
} from './AddStartupWizard/types';

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const LeftButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const RightButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  svg { animation: ${spin} 1s linear infinite; }
`;

const StepContent = styled.div`
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }

  @media (max-width: 600px) {
    max-height: 50vh;
  }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: 14px;
  margin-top: 8px;
`;

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const IntroHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const IntroTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const IntroText = styled.p`
  margin: 0;
  max-width: 560px;
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Dropzone = styled.label<{ $active?: boolean; $hasFile?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
  padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[6]}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px dashed ${({ $active, $hasFile, theme }) =>
    $active || $hasFile ? theme.colors.accent.primary : theme.colors.border.secondary};
  background: ${({ $active, $hasFile, theme }) =>
    $active || $hasFile ? `${theme.colors.accent.primary}0d` : theme.colors.bg.tertiary};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => `${theme.colors.accent.primary}0d`};
  }
`;

const DropIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => `${theme.colors.accent.primary}1a`};
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const DropTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;
`;

const DropHint = styled.span`
  margin-top: 6px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const HiddenInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

const IntroActions = styled.div`
  display: grid;
  grid-template-columns: minmax(160px, 0.4fr) 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const BtnInner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const AutofillNote = styled.div<{ $kind: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin: -8px 0 14px;
  color: ${({ $kind, theme }) =>
    $kind === 'success' ? theme.colors.accent.primary : theme.colors.status.error};
`;

interface AddStartupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void | Promise<void>;
  portfolioMode?: boolean;
}

function fillBlanks<T extends object>(prev: T, incoming: Partial<T>): T {
  const next = { ...prev };
  (Object.keys(incoming) as (keyof T)[]).forEach((key) => {
    const current = next[key];
    const isEmpty =
      current === undefined ||
      current === null ||
      current === '' ||
      (typeof current === 'number' && Number.isNaN(current)) ||
      (Array.isArray(current) && current.length === 0) ||
      (typeof current === 'object' && !Array.isArray(current) && Object.keys(current as object).length === 0);
    if (isEmpty && incoming[key] !== undefined) {
      next[key] = incoming[key] as T[keyof T];
    }
  });
  return next;
}

interface PitchDeckAutofillIntroProps {
  busy: boolean;
  error: string;
  onAnalyze: (file: File) => void;
  onSkip: (file?: File | null) => void;
}

const PitchDeckAutofillIntro: React.FC<PitchDeckAutofillIntroProps> = ({ busy, error, onAnalyze, onSkip }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  const pick = (next: File | null) => {
    if (next && !isSupportedAutofillFilename(next.name)) {
      setFile(null);
      setFileError(t('wizard.autofill.unsupportedFormat'));
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (next && next.size > 25 * 1024 * 1024) {
      setFile(null);
      setFileError(t('wizard.autofill.tooLarge'));
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFileError('');
    setFile(next);
    if (!next && inputRef.current) inputRef.current.value = '';
  };

  return (
    <Intro>
      <IntroHeader>
        <Eyebrow>{t('wizard.autofill.eyebrow')}</Eyebrow>
        <IntroTitle>{t('wizard.autofill.title')}</IntroTitle>
        <IntroText>{t('wizard.autofill.description')}</IntroText>
      </IntroHeader>

      {(fileError || error) && <AutofillNote $kind="error">{fileError || error}</AutofillNote>}

      <Dropzone
        $active={dragging}
        $hasFile={!!file}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) pick(e.dataTransfer.files?.[0] || null);
        }}
      >
        <HiddenInput
          ref={inputRef}
          type="file"
          accept={AUTOFILL_ACCEPT}
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />
        <DropIcon>{file ? <FileText size={26} /> : <Upload size={26} />}</DropIcon>
        <DropTitle>{file ? file.name : t('wizard.autofill.clickToUpload')}</DropTitle>
        <DropHint>{file ? t('wizard.autofill.readyForAnalysis') : t('wizard.autofill.fileHint')}</DropHint>
      </Dropzone>

      <IntroActions>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => onSkip(file)}>
          {t('wizard.autofill.fillManually')}
        </Button>
        <Button type="button" variant="primary" disabled={busy || !file} onClick={() => file && onAnalyze(file)}>
          {busy ? (
            <SpinnerWrap>
              <Loader2 size={16} />
              {t('wizard.autofill.analyzing')}
            </SpinnerWrap>
          ) : (
            <BtnInner>
              <Sparkles size={16} />
              {t('wizard.autofill.submit')}
            </BtnInner>
          )}
        </Button>
      </IntroActions>
    </Intro>
  );
};

export const AddStartupModal: React.FC<AddStartupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  portfolioMode = false,
}) => {
  const STORAGE_KEY = 'addStartupWizard';
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [stepA, setStepA] = useState<StepAData>({ ...initialStepA });
  const [stepB, setStepB] = useState<StepBData>({ ...initialStepB });
  const [stepC, setStepC] = useState<StepCData>({ ...initialStepC });
  const [crm, setCrm] = useState<CrmData>({ ...initialCrm, ...(portfolioMode ? { status: 'portfolio' } : {}) });

  const autofillSeq = useRef(0);
  const [showAutofillIntro, setShowAutofillIntro] = useState(true);
  const [autofillStatus, setAutofillStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [autofillMessage, setAutofillMessage] = useState('');

  const analyzeDeck = async (file: File) => {
    const seq = ++autofillSeq.current;
    setStepC(prev => ({ ...prev, pitchDeck: file }));
    setAutofillStatus('loading');
    setAutofillMessage('');
    try {
      const draft = await startupsApi.autofillPitchDeck(file);
      if (seq !== autofillSeq.current) return;
      const mapped = mapDraftToWizard(draft);
      if (mapped.filledCount === 0) {
        setAutofillStatus('error');
        setAutofillMessage(t('wizard.autofill.noData'));
        return;
      }
      setStepA(prev => fillBlanks(prev, mapped.stepA));
      setStepB(prev => fillBlanks(prev, mapped.stepB));
      setStepC(prev => ({ ...fillBlanks(prev, mapped.stepC), pitchDeck: file }));
      setAutofillStatus('success');
      setAutofillMessage(t('wizard.autofill.success', { count: mapped.filledCount }));
      setStep(0);
      setShowAutofillIntro(false);
    } catch (err) {
      if (seq !== autofillSeq.current) return;
      setAutofillStatus('error');
      const status = (err as { status?: number }).status;
      setAutofillMessage(
        status === 429
          ? t('wizard.autofill.rateLimited')
          : status === 415
            ? t('wizard.autofill.unsupportedFormat')
            : t('wizard.autofill.error'),
      );
    }
  };

  const skipToForm = (file?: File | null) => {
    autofillSeq.current += 1; // drop any in-flight analysis
    if (file) setStepC(prev => ({ ...prev, pitchDeck: file }));
    setAutofillStatus('idle');
    setAutofillMessage('');
    setStep(0);
    setShowAutofillIntro(false);
  };

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setShowAutofillIntro(false);
        if (parsed.stepA) setStepA(prev => ({ ...prev, ...parsed.stepA }));
        if (parsed.stepB) setStepB(prev => ({ ...prev, ...parsed.stepB }));
        if (parsed.stepC) setStepC(prev => ({ ...prev, ...parsed.stepC }));
        if (parsed.crm) setCrm(prev => ({ ...prev, ...parsed.crm }));
        if (typeof parsed.step === 'number') setStep(parsed.step);
      }
    } catch {}
    return () => {
      autofillSeq.current += 1;
    };
  }, [isOpen]);

  const saveToStorage = useCallback((currentStep: number, a: StepAData, b: StepBData, c: StepCData, crmD: CrmData) => {
    try {
      const stepASnapshot = { ...a, logo: null };
      const stepCSnapshot = {
        ...c,
        pitchDeck: null,
        onePager: null,
        financialModel: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: currentStep,
        stepA: stepASnapshot,
        stepB: b,
        stepC: stepCSnapshot,
        crm: crmD,
      }));
    } catch {}
  }, []);

  const resetForm = () => {
    setStep(0);
    setShowAutofillIntro(true);
    setAutofillStatus('idle');
    setAutofillMessage('');
    setStepA({ ...initialStepA });
    setStepB({ ...initialStepB });
    setStepC({ ...initialStepC });
    setCrm({ ...initialCrm, ...(portfolioMode ? { status: 'portfolio' } : {}) });
    setError('');
    setFieldErrors({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };

  const validateStepA = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!stepA.name.trim()) errs.name = t('wizard.validation.nameRequired');
    if (!stepA.industry) errs.industry = t('wizard.validation.industryRequired');
    if (!stepA.description.trim()) errs.description = t('wizard.validation.descriptionRequired');
    if (!stepA.stage) errs.stage = t('wizard.validation.stageRequired');
    if (!stepA.employees || stepA.employees < 1) errs.employees = t('wizard.validation.employeesRequired');
    if (!stepA.foundingDate) errs.foundingDate = t('wizard.validation.foundingDateRequired');
    if (!stepA.country) errs.country = t('wizard.validation.countryRequired');
    if (!stepA.businessModel) errs.businessModel = t('wizard.validation.businessModelRequired');
    if (!String(stepA.itpvFundingRequest || '').trim() || Number(stepA.itpvFundingRequest) <= 0) {
      errs.itpvFundingRequest = t('wizard.validation.fundRequestRequired');
    }
    if (!String(stepA.totalRoundSize || '').trim() || Number(stepA.totalRoundSize) <= 0) {
      errs.totalRoundSize = t('wizard.validation.totalRoundRequired');
    }

    const showMetrics = MVP_PLUS_STAGES.includes(stepA.stage);
    if (showMetrics && stepA.hasUsers) {
      if (!stepA.userCount) errs.userCount = t('wizard.validation.required');
      if (stepA.activeUsersFirstMonth === undefined) errs.activeUsersFirstMonth = t('wizard.validation.required');
      if (stepA.payingUsersFirstMonth === undefined) errs.payingUsersFirstMonth = t('wizard.validation.required');
    }
    if (showMetrics && stepA.hasPayingCustomers) {
      if (!String(stepA.revenueFirstMonth || '').trim()) errs.revenueFirstMonth = t('wizard.validation.required');
      if (!String(stepA.customerAcquisitionCost || '').trim()) errs.customerAcquisitionCost = t('wizard.validation.required');
      if (!String(stepA.churnRate || '').trim()) errs.churnRate = t('wizard.validation.required');
      if (!String(stepA.growthRateLast3Months || '').trim()) errs.growthRateLast3Months = t('wizard.validation.required');
    }
    if (stepA.hasInvestments) {
      if (stepA.investments.length === 0) {
        errs.investments = t('wizard.validation.investmentRequired');
      } else {
        for (let i = 0; i < stepA.investments.length; i++) {
          const inv = stepA.investments[i];
          if (!inv.date) errs[`inv_${i}_date`] = t('wizard.validation.required');
          for (let j = 0; j < inv.investors.length; j++) {
            const investor = inv.investors[j];
            if (!investor.source) errs[`inv_${i}_investor_${j}_source`] = t('wizard.validation.required');
            if (!investor.investorName.trim()) errs[`inv_${i}_investor_${j}_name`] = t('wizard.validation.required');
            if (!investor.amount) errs[`inv_${i}_investor_${j}_amount`] = t('wizard.validation.required');
          }
        }
      }
    }
    return errs;
  };

  const validateStepB = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!stepB.firstName.trim()) errs.firstName = t('wizard.validation.firstNameRequired');
    if (!stepB.lastName.trim()) errs.lastName = t('wizard.validation.lastNameRequired');
    if (!stepB.role) errs.role = t('wizard.validation.roleRequired');
    if (!stepB.email.trim()) errs.email = t('wizard.validation.emailRequired');
    if (!stepB.phone.trim()) errs.phone = t('wizard.validation.phoneRequired');
    if (!stepB.background.trim()) errs.background = t('wizard.validation.backgroundRequired');
    for (let i = 0; i < stepB.teamMembers.length; i++) {
      const m = stepB.teamMembers[i];
      if (!m.firstName.trim()) errs[`tm_${i}_firstName`] = t('wizard.validation.required');
      if (!m.lastName.trim()) errs[`tm_${i}_lastName`] = t('wizard.validation.required');
      if (!m.role) errs[`tm_${i}_role`] = t('wizard.validation.required');
    }
    return errs;
  };

  const validateStepC = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!portfolioMode && !stepC.pitchDeck) errs.pitchDeck = t('wizard.validation.pitchDeckRequired');
    if (!stepC.termsAccepted) errs.termsAccepted = t('wizard.validation.termsRequired');
    return errs;
  };

  const goNext = () => {
    setError('');
    setFieldErrors({});

    let errs: Record<string, string> = {};
    if (step === 0) errs = validateStepA();
    else if (step === 1) errs = validateStepB();

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    const nextStep = Math.min(step + 1, 2);
    setStep(nextStep);
    saveToStorage(nextStep, stepA, stepB, stepC, crm);
  };

  const goBack = () => {
    setError('');
    setFieldErrors({});
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    saveToStorage(prevStep, stepA, stepB, stepC, crm);
  };

  const handleSubmit = async () => {
    setError('');
    setFieldErrors({});
    const errs = validateStepC();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const crmStage = STAGE_TO_CRM[stepA.stage] || 'Pre-Seed';

      let logoBase64: string | undefined;
      if (stepA.logo) {
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(stepA.logo!);
        });
      }

      const itpvFundingRequest = stepA.itpvFundingRequest ? parseFloat(stepA.itpvFundingRequest) || 0 : 0;
      const totalRoundSize = stepA.totalRoundSize ? parseFloat(stepA.totalRoundSize) || 0 : 0;

      const selectedStatus = crm.status || 'new';
      const shouldAssignManager = selectedStatus !== 'new';
      const founderRole = stepB.role === 'Other' && stepB.customRole ? stepB.customRole : stepB.role;
      const businessModel = stepA.businessModel === 'Other' && stepA.customBusinessModel
        ? stepA.customBusinessModel
        : stepA.businessModel;

      const submissionApplication = {
        stepA: {
          name: stepA.name,
          industry: stepA.industry,
          description: stepA.description,
          stage: stepA.stage,
          employees: stepA.employees,
          hasUsers: stepA.hasUsers,
          userCount: stepA.userCount,
          activeUsersFirstMonth: stepA.activeUsersFirstMonth,
          payingUsersFirstMonth: stepA.payingUsersFirstMonth,
          hasPayingCustomers: stepA.hasPayingCustomers,
          revenueFirstMonth: stepA.revenueFirstMonth ? parseFloat(stepA.revenueFirstMonth) || 0 : undefined,
          customerAcquisitionCost: stepA.customerAcquisitionCost ? parseFloat(stepA.customerAcquisitionCost) || 0 : undefined,
          churnRate: stepA.churnRate ? parseFloat(stepA.churnRate) || 0 : undefined,
          growthRateLast3Months: stepA.growthRateLast3Months ? parseFloat(stepA.growthRateLast3Months) || 0 : undefined,
          hasTechnology: stepA.hasTechnology,
          technologyDescription: stepA.technologyDescription,
          businessModel,
          customBusinessModel: stepA.businessModel === 'Other' ? stepA.customBusinessModel : undefined,
          businessModelDescription: stepA.businessModelDescription,
          fundingRequest: itpvFundingRequest,
          itpvFundingRequest,
          totalRoundSize,
          foundingDate: stepA.foundingDate,
          country: stepA.country,
          hasInvestments: stepA.hasInvestments,
          investments: stepA.investments,
          fund: 'itpark',
          fundId: 'itpark',
        },
        stepB: {
          firstName: stepB.firstName,
          lastName: stepB.lastName,
          role: founderRole,
          customRole: stepB.role === 'Other' ? stepB.customRole : undefined,
          email: stepB.email,
          phone: stepB.phone,
          website: stepB.website,
          background: stepB.background,
          successfulProject: stepB.successfulProject,
          socialLinks: stepB.socialLinks,
          teamMembers: stepB.teamMembers,
        },
        stepC: {
          financialModelDescription: stepC.financialModelDescription,
          currentRevenueBurnRate: stepC.currentRevenueBurnRate,
          futurePlans: stepC.futurePlans,
          videoLink: stepC.videoLink,
        },
        meta: {
          fund: 'itpark',
          fundId: 'itpark',
          fundSlug: 'itpark',
          partner: 'funds-crm',
          source: 'Fund',
        },
      };

      const crmPayload = {
        submitViaSubmissionApi: !portfolioMode,
        submissionApplication,
        logoFile: stepA.logo,
        companyName: stepA.name,
        industry: stepA.industry,
        description: stepA.description,
        stage: crmStage,
        country: stepA.country || undefined,
        logo: logoBase64 || undefined,
        founderName: `${stepB.firstName} ${stepB.lastName}`.trim() || undefined,
        founderEmail: stepB.email || undefined,
        founderPhone: stepB.phone || undefined,
        founderRole: founderRole || undefined,
        founderLinkedin: stepB.socialLinks.linkedin || undefined,
        website: stepB.website || undefined,
        businessModel: businessModel || undefined,
        businessModelDescription: stepA.businessModelDescription || undefined,
        foundedYear: stepA.foundingDate ? parseInt(stepA.foundingDate) : undefined,
        teamSize: stepA.employees || 0,
        fundingRequest: itpvFundingRequest,
        itpvFundingRequest,
        totalRoundSize,
        hasUsers: stepA.hasUsers,
        userCount: stepA.userCount,
        activeUsersPerMonth: stepA.activeUsersFirstMonth,
        payingUsersPerMonth: stepA.payingUsersFirstMonth,
        hasPayingCustomers: stepA.hasPayingCustomers,
        hasTechnology: stepA.hasTechnology,
        technologyDescription: stepA.technologyDescription,
        revenueFirstMonth: stepA.revenueFirstMonth ? parseFloat(stepA.revenueFirstMonth) || undefined : undefined,
        customerAcquisitionCost: stepA.customerAcquisitionCost ? parseFloat(stepA.customerAcquisitionCost) || undefined : undefined,
        churnRate: stepA.churnRate ? parseFloat(stepA.churnRate) || undefined : undefined,
        growthRateLast3Months: stepA.growthRateLast3Months ? parseFloat(stepA.growthRateLast3Months) || undefined : undefined,
        status: selectedStatus,
        assignedManagerId: shouldAssignManager ? crm.assignedManagerId || undefined : undefined,
        assignedManagerName: shouldAssignManager ? crm.assignedManagerName || undefined : undefined,
        teamMembers: stepB.teamMembers.length > 0 ? stepB.teamMembers : undefined,
        investments: stepA.hasInvestments && stepA.investments.length > 0 ? stepA.investments : undefined,
        founderBackground: stepB.background || undefined,
        successfulProject: stepB.successfulProject || undefined,
        materials: {
          financialModelDescription: stepC.financialModelDescription || undefined,
          currentRevenueBurnRate: stepC.currentRevenueBurnRate || undefined,
          futurePlans: stepC.futurePlans || undefined,
          videoLink: stepC.videoLink || undefined,
        },
        materialFiles: {
          pitchDeck: stepC.pitchDeck,
          onePager: stepC.onePager,
          financialModel: stepC.financialModel,
        },
      };

      await onSubmit(crmPayload);

      handleClose();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err ?? '');
      if (status === 409 || /\(409\)|активн|active submission|one submission/i.test(message)) {
        setError(t('wizard.validation.activeSubmissionExists'));
      } else {
        setError(t('wizard.validation.submitError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    t('wizard.stepA.title'),
    t('wizard.stepB.title'),
    t('wizard.stepC.title'),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('addStartupModal.title')}
      width="720px"
      disableBackdropClose
    >
      {showAutofillIntro ? (
        <PitchDeckAutofillIntro
          busy={autofillStatus === 'loading'}
          error={autofillStatus === 'error' ? autofillMessage : ''}
          onAnalyze={analyzeDeck}
          onSkip={skipToForm}
        />
      ) : (
        <>
          <StepIndicator currentStep={step} />

          {step === 0 && autofillStatus === 'success' && autofillMessage && (
            <AutofillNote $kind="success">
              <CheckCircle2 size={14} />
              {autofillMessage}
            </AutofillNote>
          )}

          <StepContent>
            {step === 0 && <StepA data={stepA} onChange={setStepA} errors={fieldErrors} onClearError={clearFieldError} />}
            {step === 1 && <StepB data={stepB} onChange={setStepB} errors={fieldErrors} onClearError={clearFieldError} />}
            {step === 2 && (
              <StepC
                data={stepC}
                crmData={crm}
                onChange={setStepC}
                onCrmChange={setCrm}
                errors={fieldErrors}
                onClearError={clearFieldError}
                pitchDeckOptional={portfolioMode}
              />
            )}
          </StepContent>

          {error && <ErrorText>{error}</ErrorText>}

          <ButtonGroup>
            <LeftButtons>
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={goBack} disabled={loading}>
                  {t('common.back')}
                </Button>
              )}
            </LeftButtons>
            <RightButtons>
              {step < 2 ? (
                <Button type="button" variant="primary" onClick={goNext}>
                  {t('common.next')}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <SpinnerWrap>
                      <Loader2 size={16} />
                      {t('addStartupModal.creating')}
                    </SpinnerWrap>
                  ) : (
                    t('addStartupModal.create')
                  )}
                </Button>
              )}
            </RightButtons>
          </ButtonGroup>
        </>
      )}
    </Modal>
  );
};
