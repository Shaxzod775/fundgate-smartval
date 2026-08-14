import React, { useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Upload, X, Plus, Trash2, ChevronDown, Check, Image } from 'lucide-react';
import { Input } from '../../../../components/ui/Input/Input';
import { StepAData, Investment, Investor, Currency } from './types';
import {
  INDUSTRIES,
  STAGES,
  MVP_PLUS_STAGES,
  BUSINESS_MODELS,
  USER_COUNT_RANGES,
  INVESTMENT_SOURCES,
  COUNTRIES_EN,
  MAX_INVESTMENTS,
} from './constants';

const FieldGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label<{ $required?: boolean }>`
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $required, theme }) =>
    $required &&
    `&::after { content: " *"; color: ${theme.colors.status.error}; }`}
`;

const Textarea = styled.textarea<{ $error?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme, $error }) =>
    $error ? theme.colors.status.danger : theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 80px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme, $error }) =>
      $error ? theme.colors.status.danger : theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const ErrorText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.status.error};
  margin-top: 4px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ThreeCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
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

const SelectTrigger = styled.button<{ $isOpen?: boolean; $error?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ $isOpen, $error, theme }) =>
    $error ? theme.colors.status.danger :
    $isOpen ? theme.colors.accent.primary : theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  &:hover { border-color: ${({ theme, $error }) => $error ? theme.colors.status.danger : theme.colors.accent.primary}; }
  svg {
    transition: transform 0.2s;
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
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
  z-index: 1000;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-8px)')};
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  max-height: 200px;
  overflow-y: auto;
`;

const SelectOption = styled.div<{ $isSelected?: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  &:hover { background: rgba(255, 255, 255, 0.05); }
  ${({ $isSelected }) => $isSelected && css`background: rgba(255, 255, 255, 0.03);`}
`;

const CheckIcon = styled.span<{ $visible?: boolean }>`
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.primary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  &:focus { outline: none; }
`;

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const YesNoGroup = styled.div`
  display: flex;
  gap: 4px;
`;

const YesNoBtn = styled.button<{ $active: boolean }>`
  padding: 5px 14px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : theme.colors.border.secondary};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : 'transparent'};
  color: ${({ $active }) => ($active ? '#fff' : '#9CA3AF')};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const InvestmentCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  margin-bottom: 8px;
`;

const InvestmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const DeleteBtn = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  &:hover { color: ${({ theme }) => theme.colors.status.danger}; }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  font-size: 14px;
  width: 100%;
  justify-content: center;
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const InvestorSubCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px;
  margin-bottom: 6px;
`;

const InvestorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const SmallAddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  font-size: 12px;
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CurrencySelect = styled.select`
  padding: 10px 8px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  min-width: 80px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
  }
`;

const InputWithCurrency = styled.div`
  display: flex;
  gap: 6px;
`;

const LogoUploadZone = styled.div<{ $hasFile?: boolean }>`
  width: 80px;
  height: 80px;
  border: 2px dashed ${({ theme, $hasFile }) =>
    $hasFile ? theme.colors.accent.primary : theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const LogoRemove = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0,0,0,0.6);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
`;

const formatNum = (v: number | string): string => {
  const raw = typeof v === 'string' ? v.replace(/\s/g, '') : String(v);
  if (!raw || raw === '0') return '';
  const parts = raw.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

const parseNum = (v: string): number => parseFloat(v.replace(/\s/g, '')) || 0;

const formatCountAllowZero = (v: number | undefined): string =>
  v === undefined ? '' : (formatNum(v) || '0');
const parseCountAllowZero = (v: string): number | undefined =>
  v.trim() === '' ? undefined : parseNum(v);

const clampFloat = (v: string, max = 10000000): string => {
  if (v === '') return '';
  const withDot = v.replace(/,/g, '.');
  const cleaned = withDot.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return '';
  const parts = cleaned.split('.');
  const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
  if (sanitized.endsWith('.')) return sanitized;
  const n = parseFloat(sanitized);
  if (isNaN(n)) return '';
  if (n > max) return String(max);
  return sanitized;
};

const clampPercentage = (v: string): string => {
  if (v === '') return '';
  const withDot = v.replace(/,/g, '.');
  const cleaned = withDot.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return '';
  const parts = cleaned.split('.');
  const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
  if (sanitized.endsWith('.')) return sanitized;
  const n = parseFloat(sanitized);
  if (isNaN(n)) return '';
  if (n > 100) return '100';
  return sanitized;
};

const formatFinancial = (v?: string): string => {
  if (!v) return '';
  const parts = v.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (\u20AC)', symbol: '\u20AC' },
  { value: 'UZS', label: 'UZS', symbol: 'UZS' },
];

const getCurrencySymbol = (c: Currency) => CURRENCIES.find(x => x.value === c)?.symbol || '$';

type SelectItem = string | { value: string; label: string };

const INDUSTRY_LABEL_KEYS: Record<(typeof INDUSTRIES)[number], string> = {
  'AdTech': 'adTech',
  'AgriTech': 'agriTech',
  'AI & ML': 'aiMl',
  'AI & Food Tech': 'aiFoodTech',
  'BI & Analytics': 'biAnalytics',
  'B2B/E-commerce/SaaS': 'b2bEcommerceSaas',
  'ClimateTech & Sustainability': 'climateTechSustainability',
  'Conversational AI': 'conversationalAi',
  'Cybersecurity': 'cybersecurity',
  'E-commerce & Retail Tech': 'ecommerceRetailTech',
  'EdTech': 'edTech',
  'Energy & CleanTech': 'energyCleanTech',
  'Entertainment & Media': 'entertainmentMedia',
  'FinTech': 'finTech',
  'FoodTech': 'foodTech',
  'Gaming': 'gaming',
  'GovTech': 'govTech',
  'HealthTech & MedTech': 'healthTechMedTech',
  'HRTech': 'hrTech',
  'InsurTech': 'insurTech',
  'IoT & Hardware': 'iotHardware',
  'LegalTech': 'legalTech',
  'Logistics & Supply Chain': 'logisticsSupplyChain',
  'Marketing & AdTech': 'marketingAdTech',
  'Mobility & Transportation': 'mobilityTransportation',
  'PropTech': 'propTech',
  'RegTech': 'regTech',
  'Robotics & Automation': 'roboticsAutomation',
  'SaaS': 'saas',
  'Social Media & Networking': 'socialMediaNetworking',
  'SpaceTech': 'spaceTech',
  'SportsTech': 'sportsTech',
  'TravelTech': 'travelTech',
  'Web3 & Blockchain': 'web3Blockchain',
  'Telecom': 'telecom',
  'Other': 'other',
};

const USER_COUNT_RANGE_LABEL_KEYS: Record<(typeof USER_COUNT_RANGES)[number], string> = {
  'Less than 100': 'lessThan100',
  '100-1,000': 'from100To1000',
  '1,000-10,000': 'from1000To10000',
  'More than 10,000': 'moreThan10000',
};

const toCountryLabelKey = (country: string): string =>
  country
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char: string) => char.toUpperCase());

const normalizeSelectItem = (item: SelectItem) =>
  typeof item === 'string' ? { value: item, label: item } : item;

const SearchableDropdown: React.FC<{
  items: SelectItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}> = ({ items, value, onChange, placeholder, error }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const normalizedItems = items.map(normalizeSelectItem);
  const selected = normalizedItems.find(i => i.value === value);
  const searchQuery = search.toLowerCase();
  const filtered = normalizedItems.filter(i =>
    i.label.toLowerCase().includes(searchQuery) || i.value.toLowerCase().includes(searchQuery)
  );

  return (
    <SelectWrapper ref={ref}>
      <SelectTrigger type="button" $isOpen={isOpen} $error={error} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || value || placeholder || '—'}
        </span>
        <ChevronDown size={16} />
      </SelectTrigger>
      <SelectDropdown $isOpen={isOpen}>
        <SearchInput
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClick={e => e.stopPropagation()}
        />
        {filtered.map(item => (
          <SelectOption
            key={item.value}
            $isSelected={value === item.value}
            onClick={() => { onChange(item.value); setIsOpen(false); setSearch(''); }}
          >
            <CheckIcon $visible={value === item.value}><Check size={14} /></CheckIcon>
            {item.label}
          </SelectOption>
        ))}
      </SelectDropdown>
    </SelectWrapper>
  );
};

const Dropdown: React.FC<{
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}> = ({ items, value, onChange, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selected = items.find(i => i.value === value);

  return (
    <SelectWrapper ref={ref}>
      <SelectTrigger type="button" $isOpen={isOpen} $error={error} onClick={() => setIsOpen(!isOpen)}>
        <span>{selected?.label || placeholder || '—'}</span>
        <ChevronDown size={16} />
      </SelectTrigger>
      <SelectDropdown $isOpen={isOpen}>
        {items.map(item => (
          <SelectOption
            key={item.value}
            $isSelected={value === item.value}
            onClick={() => { onChange(item.value); setIsOpen(false); }}
          >
            <CheckIcon $visible={value === item.value}><Check size={14} /></CheckIcon>
            {item.label}
          </SelectOption>
        ))}
      </SelectDropdown>
    </SelectWrapper>
  );
};

interface StepAProps {
  data: StepAData;
  onChange: (data: StepAData) => void;
  errors?: Record<string, string>;
  onClearError?: (field: string) => void;
}

export const StepA: React.FC<StepAProps> = ({ data, onChange, errors = {}, onClearError }) => {
  const { t } = useTranslation();
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const update = (partial: Partial<StepAData>) => {
    onChange({ ...data, ...partial });
    if (onClearError) {
      Object.keys(partial).forEach(k => onClearError(k));
    }
  };

  const showMetrics = MVP_PLUS_STAGES.includes(data.stage);

  const translateWithFallback = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const industryItems = INDUSTRIES.map(industry => ({
    value: industry,
    label: translateWithFallback(`wizard.industries.${INDUSTRY_LABEL_KEYS[industry]}`, industry),
  }));
  const stageItems = STAGES.map(s => ({ value: s.value, label: t(s.labelKey) }));
  const businessModelItems = BUSINESS_MODELS.map(b => ({ value: b.value, label: t(b.labelKey) }));
  const investmentSourceItems = INVESTMENT_SOURCES.map(s => ({ value: s.value, label: t(s.labelKey) }));
  const countryItems = COUNTRIES_EN.map(country => ({
    value: country,
    label: translateWithFallback(`wizard.countries.${toCountryLabelKey(country)}`, country),
  }));
  const userCountItems = USER_COUNT_RANGES.map(range => ({
    value: range,
    label: translateWithFallback(`wizard.userCountRanges.${USER_COUNT_RANGE_LABEL_KEYS[range]}`, range),
  }));

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      update({ logo: f });
      setLogoPreview(URL.createObjectURL(f));
    }
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    update({ logo: null });
    setLogoPreview(null);
    if (logoRef.current) logoRef.current.value = '';
  };

  const addInvestment = () => {
    if (data.investments.length >= MAX_INVESTMENTS) return;
    update({
      investments: [...data.investments, { investors: [{ source: '', investorName: '', amount: 0, currency: 'USD' }], valuation: 0, currency: 'USD', date: '' }],
    });
  };

  const updateInvestment = (idx: number, partial: Partial<Investment>) => {
    const updated = data.investments.map((inv, i) => (i === idx ? { ...inv, ...partial } : inv));
    update({ investments: updated });
  };

  const removeInvestment = (idx: number) => {
    update({ investments: data.investments.filter((_, i) => i !== idx) });
  };

  const addInvestor = (roundIdx: number) => {
    const updated = data.investments.map((inv, i) =>
      i === roundIdx ? { ...inv, investors: [...inv.investors, { source: '', investorName: '', amount: 0, currency: inv.currency || 'USD' }] } : inv
    );
    update({ investments: updated });
  };

  const updateInvestor = (roundIdx: number, invIdx: number, partial: Partial<Investor>) => {
    const updated = data.investments.map((inv, i) =>
      i === roundIdx ? { ...inv, investors: inv.investors.map((investor, j) => j === invIdx ? { ...investor, ...partial } : investor) } : inv
    );
    update({ investments: updated });
  };

  const removeInvestor = (roundIdx: number, invIdx: number) => {
    const updated = data.investments.map((inv, i) =>
      i === roundIdx ? { ...inv, investors: inv.investors.filter((_, j) => j !== invIdx) } : inv
    );
    update({ investments: updated });
  };

  return (
    <div>
      <input type="file" ref={logoRef} onChange={handleLogoSelect} style={{ display: 'none' }} accept="image/*" />

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <LogoUploadZone $hasFile={!!logoPreview} onClick={() => logoRef.current?.click()}>
          {logoPreview ? (
            <>
              <img src={logoPreview} alt="Logo" />
              <LogoRemove type="button" onClick={removeLogo}><X size={12} /></LogoRemove>
            </>
          ) : (
            <Image size={24} color="#9CA3AF" />
          )}
        </LogoUploadZone>
        <div style={{ flex: 1 }}>
          <Input
            label={t('wizard.stepA.name')}
            placeholder={t('wizard.stepA.namePlaceholder')}
            value={data.name}
            onChange={e => update({ name: e.target.value })}
            required
            error={errors.name}
          />
        </div>
      </div>

      <TwoCol>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.industry')}</Label>
          <SearchableDropdown
            items={industryItems}
            value={data.industry}
            onChange={v => update({ industry: v })}
            placeholder={t('wizard.stepA.industryPlaceholder')}
            error={!!errors.industry}
          />
          {errors.industry && <ErrorText>{errors.industry}</ErrorText>}
        </FieldGroup>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.stage')}</Label>
          <Dropdown
            items={stageItems}
            value={data.stage}
            onChange={v => update({ stage: v })}
            placeholder={t('wizard.stepA.stagePlaceholder')}
            error={!!errors.stage}
          />
          {errors.stage && <ErrorText>{errors.stage}</ErrorText>}
        </FieldGroup>
      </TwoCol>

      <FieldGroup>
        <Label $required>{t('wizard.stepA.description')}</Label>
        <Textarea
          rows={3}
          maxLength={2500}
          placeholder={t('wizard.stepA.descriptionPlaceholder')}
          value={data.description}
          onChange={e => update({ description: e.target.value })}
          $error={!!errors.description}
        />
        {errors.description && <ErrorText>{errors.description}</ErrorText>}
        <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>
          {data.description.length}/2500
        </div>
      </FieldGroup>

      <ThreeCol>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.employees')}</Label>
          <NumberInput
            type="text"
            inputMode="numeric"
            value={data.employees > 0 ? formatNum(data.employees) : ''}
            onChange={e => update({ employees: Math.min(parseNum(e.target.value), 100000) })}
            placeholder="1"
          />
          {errors.employees && <ErrorText>{errors.employees}</ErrorText>}
        </FieldGroup>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.foundingDate')}</Label>
          <Dropdown
            items={Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => {
              const y = String(new Date().getFullYear() - i);
              return { value: y, label: y };
            })}
            value={data.foundingDate}
            onChange={v => update({ foundingDate: v })}
            placeholder={t('wizard.stepA.foundingDatePlaceholder')}
            error={!!errors.foundingDate}
          />
          {errors.foundingDate && <ErrorText>{errors.foundingDate}</ErrorText>}
        </FieldGroup>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.country')}</Label>
          <SearchableDropdown
            items={countryItems}
            value={data.country}
            onChange={v => update({ country: v })}
            placeholder={t('wizard.stepA.countryPlaceholder')}
            error={!!errors.country}
          />
          {errors.country && <ErrorText>{errors.country}</ErrorText>}
        </FieldGroup>
      </ThreeCol>

      <SectionTitle>{t('wizard.stepA.fundingSection')}</SectionTitle>
      <TwoCol>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.itpvFundingRequest')}</Label>
          <NumberInput
            type="text"
            inputMode="decimal"
            value={formatFinancial(data.itpvFundingRequest)}
            onChange={e => update({ itpvFundingRequest: clampFloat(e.target.value.replace(/\s/g, ''), 1000000000) })}
            placeholder="0"
          />
          {errors.itpvFundingRequest && <ErrorText>{errors.itpvFundingRequest}</ErrorText>}
        </FieldGroup>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.totalRoundSize')}</Label>
          <NumberInput
            type="text"
            inputMode="decimal"
            value={formatFinancial(data.totalRoundSize)}
            onChange={e => update({ totalRoundSize: clampFloat(e.target.value.replace(/\s/g, ''), 1000000000) })}
            placeholder="0"
          />
          {errors.totalRoundSize && <ErrorText>{errors.totalRoundSize}</ErrorText>}
        </FieldGroup>
      </TwoCol>

      <ToggleRow>
        <Label style={{ marginBottom: 0 }}>{t('wizard.stepA.hasTechnology')}</Label>
        <YesNoGroup>
          <YesNoBtn type="button" $active={data.hasTechnology} onClick={() => update({ hasTechnology: true })}>{t('common.yes')}</YesNoBtn>
          <YesNoBtn type="button" $active={!data.hasTechnology} onClick={() => update({ hasTechnology: false })}>{t('common.no')}</YesNoBtn>
        </YesNoGroup>
      </ToggleRow>
      {data.hasTechnology && (
        <FieldGroup>
          <Textarea
            rows={2}
            maxLength={3500}
            placeholder={t('wizard.stepA.technologyDescriptionPlaceholder')}
            value={data.technologyDescription || ''}
            onChange={e => update({ technologyDescription: e.target.value })}
          />
        </FieldGroup>
      )}

      <TwoCol>
        <FieldGroup>
          <Label $required>{t('wizard.stepA.businessModel')}</Label>
          <Dropdown
            items={businessModelItems}
            value={data.businessModel}
            onChange={v => update({ businessModel: v })}
            placeholder="—"
            error={!!errors.businessModel}
          />
          {errors.businessModel && <ErrorText>{errors.businessModel}</ErrorText>}
        </FieldGroup>
        {data.businessModel === 'Other' && (
          <FieldGroup>
            <Label>{t('wizard.stepA.customBusinessModel')}</Label>
            <NumberInput
              type="text"
              value={data.customBusinessModel || ''}
              onChange={e => update({ customBusinessModel: e.target.value })}
              placeholder={t('wizard.stepA.customBusinessModelPlaceholder')}
            />
          </FieldGroup>
        )}
      </TwoCol>

      {data.businessModel && (
        <FieldGroup>
          <Label>{t('wizard.stepA.businessModelDescription')}</Label>
          <Textarea
            rows={2}
            maxLength={3500}
            placeholder={t('wizard.stepA.businessModelDescriptionPlaceholder')}
            value={data.businessModelDescription || ''}
            onChange={e => update({ businessModelDescription: e.target.value })}
          />
        </FieldGroup>
      )}

      {showMetrics && (
        <>
          <SectionTitle>{t('wizard.stepA.userMetrics')}</SectionTitle>
          <ToggleRow>
            <Label style={{ marginBottom: 0 }}>{t('wizard.stepA.hasUsers')}</Label>
            <YesNoGroup>
              <YesNoBtn type="button" $active={data.hasUsers} onClick={() => update({ hasUsers: true })}>{t('common.yes')}</YesNoBtn>
              <YesNoBtn type="button" $active={!data.hasUsers} onClick={() => update({ hasUsers: false })}>{t('common.no')}</YesNoBtn>
            </YesNoGroup>
          </ToggleRow>
          {data.hasUsers && (
            <ThreeCol>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.userCount')}</Label>
                <Dropdown
                  items={userCountItems}
                  value={data.userCount || ''}
                  onChange={v => update({ userCount: v })}
                  error={!!errors.userCount}
                />
                {errors.userCount && <ErrorText>{errors.userCount}</ErrorText>}
              </FieldGroup>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.activeUsersFirstMonth')}</Label>
                <NumberInput
                  type="text"
                  inputMode="numeric"
                  value={formatCountAllowZero(data.activeUsersFirstMonth)}
                  onChange={e => update({ activeUsersFirstMonth: parseCountAllowZero(e.target.value) })}
                  placeholder="0"
                />
                {errors.activeUsersFirstMonth && <ErrorText>{errors.activeUsersFirstMonth}</ErrorText>}
              </FieldGroup>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.payingUsersFirstMonth')}</Label>
                <NumberInput
                  type="text"
                  inputMode="numeric"
                  value={data.payingUsersFirstMonth ? formatNum(data.payingUsersFirstMonth) : ''}
                  onChange={e => update({ payingUsersFirstMonth: parseNum(e.target.value) })}
                  placeholder="0"
                />
                {errors.payingUsersFirstMonth && <ErrorText>{errors.payingUsersFirstMonth}</ErrorText>}
              </FieldGroup>
            </ThreeCol>
          )}

          <SectionTitle>{t('wizard.stepA.financialMetrics')}</SectionTitle>
          <ToggleRow>
            <Label style={{ marginBottom: 0 }}>{t('wizard.stepA.hasPayingCustomers')}</Label>
            <YesNoGroup>
              <YesNoBtn type="button" $active={data.hasPayingCustomers} onClick={() => update({ hasPayingCustomers: true })}>{t('common.yes')}</YesNoBtn>
              <YesNoBtn type="button" $active={!data.hasPayingCustomers} onClick={() => update({ hasPayingCustomers: false })}>{t('common.no')}</YesNoBtn>
            </YesNoGroup>
          </ToggleRow>
          {data.hasPayingCustomers && (
            <TwoCol>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.revenueFirstMonth')}</Label>
                <NumberInput
                  type="text"
                  inputMode="decimal"
                  value={formatFinancial(data.revenueFirstMonth)}
                  onChange={e => update({ revenueFirstMonth: clampFloat(e.target.value.replace(/\s/g, '')) })}
                  placeholder="0"
                />
                {errors.revenueFirstMonth && <ErrorText>{errors.revenueFirstMonth}</ErrorText>}
              </FieldGroup>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.customerAcquisitionCost')}</Label>
                <NumberInput
                  type="text"
                  inputMode="decimal"
                  value={formatFinancial(data.customerAcquisitionCost)}
                  onChange={e => update({ customerAcquisitionCost: clampFloat(e.target.value.replace(/\s/g, '')) })}
                  placeholder="0"
                />
                {errors.customerAcquisitionCost && <ErrorText>{errors.customerAcquisitionCost}</ErrorText>}
              </FieldGroup>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.churnRate')}</Label>
                <NumberInput
                  type="text"
                  inputMode="decimal"
                  value={data.churnRate || ''}
                  onChange={e => update({ churnRate: clampPercentage(e.target.value) })}
                  placeholder="0"
                />
                {errors.churnRate && <ErrorText>{errors.churnRate}</ErrorText>}
              </FieldGroup>
              <FieldGroup>
                <Label $required>{t('wizard.stepA.growthRate')}</Label>
                <NumberInput
                  type="text"
                  inputMode="decimal"
                  value={data.growthRateLast3Months || ''}
                  onChange={e => update({ growthRateLast3Months: clampPercentage(e.target.value) })}
                  placeholder="0"
                />
                {errors.growthRateLast3Months && <ErrorText>{errors.growthRateLast3Months}</ErrorText>}
              </FieldGroup>
            </TwoCol>
          )}
        </>
      )}

      <SectionTitle>{t('wizard.stepA.investments')}</SectionTitle>
      <ToggleRow>
        <Label style={{ marginBottom: 0 }}>{t('wizard.stepA.hasInvestments')}</Label>
        <YesNoGroup>
          <YesNoBtn type="button" $active={data.hasInvestments} onClick={() => {
            if (!data.hasInvestments && data.investments.length === 0) {
              update({ hasInvestments: true, investments: [{ investors: [{ source: '', investorName: '', amount: 0, currency: 'USD' }], valuation: 0, currency: 'USD', date: '' }] });
            } else {
              update({ hasInvestments: true });
            }
          }}>{t('common.yes')}</YesNoBtn>
          <YesNoBtn type="button" $active={!data.hasInvestments} onClick={() => update({ hasInvestments: false, investments: [] })}>{t('common.no')}</YesNoBtn>
        </YesNoGroup>
      </ToggleRow>
      {data.hasInvestments && (
        <>
          {data.investments.map((inv, idx) => (
            <InvestmentCard key={idx}>
              <InvestmentHeader>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
                  {t('wizard.stepA.investmentRound')} #{idx + 1}
                </span>
                <DeleteBtn type="button" onClick={() => removeInvestment(idx)}>
                  <Trash2 size={14} />
                </DeleteBtn>
              </InvestmentHeader>
              <TwoCol>
                <FieldGroup>
                  <Label>{t('wizard.stepA.investmentDate')}</Label>
                  <SearchableDropdown
                    items={Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => String(new Date().getFullYear() - i))}
                    value={inv.date}
                    onChange={v => { updateInvestment(idx, { date: v }); onClearError?.(`inv_${idx}_date`); }}
                    placeholder="2024"
                    error={!!errors[`inv_${idx}_date`]}
                  />
                  {errors[`inv_${idx}_date`] && <ErrorText>{errors[`inv_${idx}_date`]}</ErrorText>}
                </FieldGroup>
                <FieldGroup>
                  <Label>{t('wizard.stepA.roundValuation')}</Label>
                  <InputWithCurrency>
                    <NumberInput
                      type="text"
                      inputMode="decimal"
                      value={inv.valuation ? formatNum(inv.valuation) : ''}
                      onChange={e => updateInvestment(idx, { valuation: parseNum(e.target.value) })}
                      placeholder="0"
                      style={{ flex: 1 }}
                    />
                    <CurrencySelect
                      value={inv.currency || 'USD'}
                      onChange={e => {
                        const cur = e.target.value as Currency;
                        updateInvestment(idx, {
                          currency: cur,
                          investors: inv.investors.map(i => ({ ...i, currency: cur })),
                        });
                      }}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </CurrencySelect>
                  </InputWithCurrency>
                </FieldGroup>
              </TwoCol>

              {inv.investors.map((investor, invIdx) => (
                <InvestorSubCard key={invIdx}>
                  <InvestorHeader>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {t('wizard.stepA.investor')} #{invIdx + 1}
                    </span>
                    {inv.investors.length > 1 && (
                      <DeleteBtn type="button" onClick={() => removeInvestor(idx, invIdx)}>
                        <Trash2 size={12} />
                      </DeleteBtn>
                    )}
                  </InvestorHeader>
                  <ThreeCol>
                    <FieldGroup>
                      <Label>{t('wizard.stepA.investmentSource')}</Label>
                      <Dropdown
                        items={investmentSourceItems}
                        value={investor.source}
                        onChange={v => { updateInvestor(idx, invIdx, { source: v }); onClearError?.(`inv_${idx}_investor_${invIdx}_source`); }}
                        placeholder="—"
                        error={!!errors[`inv_${idx}_investor_${invIdx}_source`]}
                      />
                      {errors[`inv_${idx}_investor_${invIdx}_source`] && <ErrorText>{errors[`inv_${idx}_investor_${invIdx}_source`]}</ErrorText>}
                    </FieldGroup>
                    <FieldGroup>
                      <Label>{t('wizard.stepA.investorName')}</Label>
                      <NumberInput
                        type="text"
                        value={investor.investorName}
                        onChange={e => { updateInvestor(idx, invIdx, { investorName: e.target.value }); onClearError?.(`inv_${idx}_investor_${invIdx}_name`); }}
                        placeholder={t('wizard.stepA.investorNamePlaceholder')}
                        style={errors[`inv_${idx}_investor_${invIdx}_name`] ? { borderColor: '#ef4444' } : {}}
                      />
                      {errors[`inv_${idx}_investor_${invIdx}_name`] && <ErrorText>{errors[`inv_${idx}_investor_${invIdx}_name`]}</ErrorText>}
                    </FieldGroup>
                    <FieldGroup>
                      <Label>{t('wizard.stepA.investmentAmount')} ({getCurrencySymbol(inv.currency || 'USD')})</Label>
                      <NumberInput
                        type="text"
                        inputMode="decimal"
                        value={investor.amount ? formatNum(investor.amount) : ''}
                        onChange={e => { updateInvestor(idx, invIdx, { amount: parseNum(e.target.value) }); onClearError?.(`inv_${idx}_investor_${invIdx}_amount`); }}
                        placeholder="0"
                        style={errors[`inv_${idx}_investor_${invIdx}_amount`] ? { borderColor: '#ef4444' } : {}}
                      />
                      {errors[`inv_${idx}_investor_${invIdx}_amount`] && <ErrorText>{errors[`inv_${idx}_investor_${invIdx}_amount`]}</ErrorText>}
                    </FieldGroup>
                  </ThreeCol>
                </InvestorSubCard>
              ))}
              <SmallAddBtn type="button" onClick={() => addInvestor(idx)}>
                <Plus size={12} /> {t('wizard.stepA.addInvestor')}
              </SmallAddBtn>
            </InvestmentCard>
          ))}
          {errors.investments && <ErrorText>{errors.investments}</ErrorText>}
          {data.investments.length < MAX_INVESTMENTS && (
            <AddBtn type="button" onClick={addInvestment}>
              <Plus size={14} /> {t('wizard.stepA.addInvestment')}
            </AddBtn>
          )}
        </>
      )}
    </div>
  );
};
