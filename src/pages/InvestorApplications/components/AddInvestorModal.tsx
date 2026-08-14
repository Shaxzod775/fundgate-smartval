import React, { useState, useRef, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, X } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import { Button } from '../../../components/ui/Button/Button';

const FieldGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const Label = styled.label<{ $required?: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};

  ${({ $required, theme }) =>
    $required &&
    `
    &::after {
      content: " *";
      color: ${theme.colors.status.error};
    }
  `}
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const NumberInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: all ${({ theme }) => theme.transitions.base};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectTrigger = styled.button<{ $isOpen?: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ $isOpen, theme }) =>
    $isOpen ? theme.colors.accent.primary : theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SelectDropdown = styled.div<{ $isOpen?: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  z-index: 1000;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: ${({ $isOpen }) => $isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  max-height: 200px;
  overflow-y: auto;
`;

const SelectOption = styled.div<{ $isSelected?: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  ${({ $isSelected }) => $isSelected && css`
    background: rgba(255, 255, 255, 0.03);
  `}
`;

const CheckIcon = styled.span<{ $visible?: boolean }>`
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.primary};
  opacity: ${({ $visible }) => $visible ? 1 : 0};
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Tag = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: ${({ theme }) => `${theme.colors.accent.primary}15`};
  color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;

  button {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    margin-left: 2px;

    &:hover {
      opacity: 0.7;
    }
  }
`;

const formatNumberWithSpaces = (value: number | string): string => {
  const num = typeof value === 'string' ? value.replace(/\s/g, '') : String(value);
  if (!num || num === '0') return '';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const parseFormattedNumber = (value: string): number => {
  const cleaned = value.replace(/\s/g, '');
  return parseInt(cleaned) || 0;
};

const STAGE_OPTIONS = ['MVP', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'];
const INDUSTRY_OPTIONS = ['FinTech', 'HealthTech', 'EdTech', 'AI/ML', 'SaaS', 'E-Commerce', 'CleanTech', 'AgriTech', 'PropTech', 'GameDev'];

interface FormData {
  fundName: string;
  email: string;
  phone: string;
  country: string;
  stages: string[];
  checkFrom: number;
  checkTo: number;
  industries: string[];
  request: string;
}

interface AddInvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}

export const AddInvestorModal: React.FC<AddInvestorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    fundName: '',
    email: '',
    phone: '',
    country: '',
    stages: [],
    checkFrom: 0,
    checkTo: 0,
    industries: [],
    request: '',
  });

  const [loading, setLoading] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const industryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageRef.current && !stageRef.current.contains(event.target as Node)) {
        setIsStageDropdownOpen(false);
      }
      if (industryRef.current && !industryRef.current.contains(event.target as Node)) {
        setIsIndustryDropdownOpen(false);
      }
    };

    if (isStageDropdownOpen || isIndustryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStageDropdownOpen, isIndustryDropdownOpen]);

  const selectStage = (stage: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.includes(stage) ? [] : [stage],
    }));
    setIsStageDropdownOpen(false);
  };

  const toggleIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onSubmit(formData);
    setLoading(false);
    onClose();
    setFormData({
      fundName: '',
      email: '',
      phone: '',
      country: '',
      stages: [],
      checkFrom: 0,
      checkTo: 0,
      industries: [],
      request: '',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('investorApplications.addTitle')}
      width="600px"
    >
      <form onSubmit={handleSubmit}>
        <Input
          label={t('investorApplications.fields.fundName')}
          placeholder={t('investorApplications.fields.fundNamePlaceholder')}
          value={formData.fundName}
          onChange={(e) => setFormData(prev => ({ ...prev, fundName: e.target.value }))}
          required
          autoFocus
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input
            label={t('investorApplications.fields.email')}
            placeholder="investor@fund.com"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
          <Input
            label={t('investorApplications.fields.phone')}
            placeholder="+998 90 123 45 67"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>

        <Input
          label={t('investorApplications.fields.country')}
          placeholder={t('investorApplications.fields.countryPlaceholder')}
          value={formData.country}
          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
        />

        <FieldGroup>
          <Label>{t('investorApplications.fields.stages')}</Label>
          <SelectWrapper ref={stageRef}>
            <SelectTrigger
              type="button"
              $isOpen={isStageDropdownOpen}
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
            >
              <span>
                {formData.stages.length > 0
                  ? formData.stages[0]
                  : t('investorApplications.fields.selectStages')}
              </span>
              <ChevronDown size={18} />
            </SelectTrigger>
            <SelectDropdown $isOpen={isStageDropdownOpen}>
              {STAGE_OPTIONS.map((stage) => (
                <SelectOption
                  key={stage}
                  $isSelected={formData.stages.includes(stage)}
                  onClick={() => selectStage(stage)}
                >
                  <CheckIcon $visible={formData.stages.includes(stage)}>
                    <Check size={16} />
                  </CheckIcon>
                  {stage}
                </SelectOption>
              ))}
            </SelectDropdown>
          </SelectWrapper>
          {false && formData.stages.length > 0 && (
            <TagsContainer>
              {formData.stages.map(stage => (
                <Tag key={stage}>
                  {stage}
                  <button type="button" onClick={() => selectStage(stage)}>
                    <X size={12} />
                  </button>
                </Tag>
              ))}
            </TagsContainer>
          )}
        </FieldGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FieldGroup>
            <Label>{t('investorApplications.fields.checkFrom')}</Label>
            <NumberInput
              type="text"
              inputMode="numeric"
              value={formatNumberWithSpaces(formData.checkFrom)}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s]/g, '');
                setFormData(prev => ({ ...prev, checkFrom: Math.min(parseFormattedNumber(value), 1000000000) }));
              }}
              placeholder="$0"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>{t('investorApplications.fields.checkTo')}</Label>
            <NumberInput
              type="text"
              inputMode="numeric"
              value={formatNumberWithSpaces(formData.checkTo)}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s]/g, '');
                setFormData(prev => ({ ...prev, checkTo: Math.min(parseFormattedNumber(value), 1000000000) }));
              }}
              placeholder="$0"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label>{t('investorApplications.fields.industries')}</Label>
          <SelectWrapper ref={industryRef}>
            <SelectTrigger
              type="button"
              $isOpen={isIndustryDropdownOpen}
              onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen)}
            >
              <span>
                {formData.industries.length > 0
                  ? `${formData.industries.length} ${t('investorApplications.fields.selected')}`
                  : t('investorApplications.fields.selectIndustries')}
              </span>
              <ChevronDown size={18} />
            </SelectTrigger>
            <SelectDropdown $isOpen={isIndustryDropdownOpen}>
              {INDUSTRY_OPTIONS.map((industry) => (
                <SelectOption
                  key={industry}
                  $isSelected={formData.industries.includes(industry)}
                  onClick={() => toggleIndustry(industry)}
                >
                  <CheckIcon $visible={formData.industries.includes(industry)}>
                    <Check size={16} />
                  </CheckIcon>
                  {industry}
                </SelectOption>
              ))}
            </SelectDropdown>
          </SelectWrapper>
          {formData.industries.length > 0 && (
            <TagsContainer>
              {formData.industries.map(industry => (
                <Tag key={industry}>
                  {industry}
                  <button type="button" onClick={() => toggleIndustry(industry)}>
                    <X size={12} />
                  </button>
                </Tag>
              ))}
            </TagsContainer>
          )}
        </FieldGroup>

        <FieldGroup>
          <Label>{t('investorApplications.fields.request')}</Label>
          <Textarea
            rows={3}
            placeholder={t('investorApplications.fields.requestPlaceholder')}
            value={formData.request}
            onChange={(e) => setFormData(prev => ({ ...prev, request: e.target.value }))}
          />
        </FieldGroup>

        <ButtonGroup>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !formData.fundName || !formData.email}>
            {loading ? t('investorApplications.creating') : t('investorApplications.create')}
          </Button>
        </ButtonGroup>
      </form>
    </Modal>
  );
};
