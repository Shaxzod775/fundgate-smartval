import React, { useState, useRef, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X, ChevronDown, Check } from 'lucide-react';
import { StepCData, CrmData } from './types';
import { STATUS_OPTIONS } from './constants';
import { teamApi, Manager } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';

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

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 60px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ErrorText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.status.error};
  margin-top: 4px;
`;

const UploadZone = styled.div<{ $isDragging?: boolean; $hasFile?: boolean; $error?: boolean }>`
  border: 2px dashed ${({ theme, $isDragging, $error }) =>
    $error ? theme.colors.status.danger :
    $isDragging ? theme.colors.accent.primary : theme.colors.border.secondary};
  background: ${({ theme, $isDragging }) =>
    $isDragging ? `${theme.colors.accent.primary}10` : theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
  ${({ $hasFile }) => $hasFile && css`
    border-style: solid;
    background: ${({ theme }) => theme.colors.bg.tertiary};
  `}
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
`;

const FileInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const FileName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
`;

const FileSize = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.status.danger};
  }
`;

const UploadText = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  span { color: ${({ theme }) => theme.colors.accent.primary}; font-weight: 500; }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectTrigger = styled.button<{ $isOpen?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
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
  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  svg {
    transition: transform 0.2s;
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`;

const ManagerDisabledNote = styled.div`
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
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

const CheckIconStyled = styled.span<{ $visible?: boolean }>`
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.primary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  margin-top: 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`;

const Checkbox = styled.input`
  margin-top: 2px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: ${({ theme }) => theme.colors.accent.primary};
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
`;

const FileUpload: React.FC<{
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
  error?: string;
}> = ({ label, required, file, onChange, accept = '.pdf,.ppt,.docx,.xls,.xlsx', error }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) onChange(e.dataTransfer.files[0]);
  };

  return (
    <FieldGroup>
      <Label $required={required}>{label}</Label>
      <input
        type="file"
        ref={ref}
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
        style={{ display: 'none' }}
        accept={accept}
      />
      <UploadZone
        $isDragging={isDragging}
        $hasFile={!!file}
        $error={!!error}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && ref.current?.click()}
      >
        {file ? (
          <FilePreview>
            <div style={{ background: '#e0e7ff', padding: 8, borderRadius: 8, color: '#4f46e5' }}>
              <FileText size={20} />
            </div>
            <FileInfo>
              <FileName>{file.name}</FileName>
              <FileSize>{(file.size / 1024 / 1024).toFixed(2)} MB</FileSize>
            </FileInfo>
            <RemoveButton type="button" onClick={e => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ''; }}>
              <X size={18} />
            </RemoveButton>
          </FilePreview>
        ) : (
          <>
            <Upload size={20} color="#9CA3AF" />
            <UploadText>
              {t('wizard.stepC.fileUploadHint', { label })}
            </UploadText>
          </>
        )}
      </UploadZone>
      {error && <ErrorText>{error}</ErrorText>}
    </FieldGroup>
  );
};

const Dropdown: React.FC<{
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ items, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selected = items.find(i => i.value === value);

  return (
    <SelectWrapper ref={ref}>
      <SelectTrigger type="button" $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
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
            <CheckIconStyled $visible={value === item.value}><Check size={14} /></CheckIconStyled>
            {item.label}
          </SelectOption>
        ))}
      </SelectDropdown>
    </SelectWrapper>
  );
};

interface StepCProps {
  data: StepCData;
  crmData: CrmData;
  onChange: (data: StepCData) => void;
  onCrmChange: (data: CrmData) => void;
  errors?: Record<string, string>;
  onClearError?: (field: string) => void;
  pitchDeckOptional?: boolean;
}

export const StepC: React.FC<StepCProps> = ({ data, crmData, onChange, onCrmChange, errors = {}, onClearError, pitchDeckOptional = false }) => {
  const { t } = useTranslation();
  const { organization } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const isNewStatus = crmData.status === 'new';

  useEffect(() => {
    if (organization?.id) {
      teamApi.getMembers(organization.id).then(res => {
        if (res.data) setManagers(res.data.filter((m: Manager) => m.isActive !== false));
      }).catch(() => {});
    }
  }, [organization?.id]);

  const update = (partial: Partial<StepCData>) => {
    onChange({ ...data, ...partial });
    if (onClearError) {
      Object.keys(partial).forEach(k => onClearError(k));
    }
  };
  const updateCrm = (partial: Partial<CrmData>) => onCrmChange({ ...crmData, ...partial });

  useEffect(() => {
    if (isNewStatus && crmData.assignedManagerId) {
      updateCrm({ assignedManagerId: '', assignedManagerName: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewStatus, crmData.assignedManagerId]);

  const statusItems = STATUS_OPTIONS.map(s => ({
    value: s,
    label: t(`startups.status.${s}`),
  }));

  const managerItems = managers.map(m => ({ value: m.id, label: m.name }));

  return (
    <div>
      <SectionTitle>{t('wizard.stepC.documents')}</SectionTitle>

      <FileUpload
        label={t('wizard.stepC.pitchDeck')}
        required={!pitchDeckOptional}
        file={data.pitchDeck}
        onChange={f => update({ pitchDeck: f })}
        error={errors.pitchDeck}
      />

      <TwoCol>
        <FileUpload
          label={t('wizard.stepC.onePager')}
          file={data.onePager}
          onChange={f => update({ onePager: f })}
        />
        <FileUpload
          label={t('wizard.stepC.financialModel')}
          file={data.financialModel}
          onChange={f => update({ financialModel: f })}
        />
      </TwoCol>

      <SectionTitle>{t('wizard.stepC.additionalInfo')}</SectionTitle>

      <FieldGroup>
        <Label>{t('wizard.stepC.financialModelDescription')}</Label>
        <Textarea
          rows={2}
          placeholder={t('wizard.stepC.financialModelDescriptionPlaceholder')}
          value={data.financialModelDescription || ''}
          onChange={e => update({ financialModelDescription: e.target.value })}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>{t('wizard.stepC.currentRevenueBurnRate')}</Label>
        <Textarea
          rows={2}
          placeholder={t('wizard.stepC.currentRevenueBurnRatePlaceholder')}
          value={data.currentRevenueBurnRate || ''}
          onChange={e => update({ currentRevenueBurnRate: e.target.value })}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>{t('wizard.stepC.futurePlans')}</Label>
        <Textarea
          rows={2}
          placeholder={t('wizard.stepC.futurePlansPlaceholder')}
          value={data.futurePlans || ''}
          onChange={e => update({ futurePlans: e.target.value })}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>{t('wizard.stepC.videoLink')}</Label>
        <NumberInput
          type="text"
          value={data.videoLink || ''}
          onChange={e => update({ videoLink: e.target.value })}
          placeholder="https://youtube.com/..."
        />
      </FieldGroup>

      <SectionTitle>{t('wizard.stepC.crmSettings')}</SectionTitle>
      <TwoCol>
        <FieldGroup>
          <Label>{t('wizard.stepC.status')}</Label>
          <Dropdown
            items={statusItems}
            value={crmData.status}
            onChange={v => updateCrm({
              status: v,
              ...(v === 'new' ? { assignedManagerId: '', assignedManagerName: '' } : {}),
            })}
          />
        </FieldGroup>
        <FieldGroup>
          <Label>{t('wizard.stepC.assignedManager')}</Label>
          {isNewStatus ? (
            <ManagerDisabledNote>{t('wizard.stepC.newStatusManagerDisabled')}</ManagerDisabledNote>
          ) : (
            <Dropdown
              items={managerItems}
              value={crmData.assignedManagerId}
              onChange={v => {
                const mgr = managers.find(m => m.id === v);
                updateCrm({ assignedManagerId: v, assignedManagerName: mgr?.name || '' });
              }}
              placeholder={t('wizard.stepC.selectManager')}
            />
          )}
        </FieldGroup>
      </TwoCol>

      <CheckboxRow>
        <Checkbox
          type="checkbox"
          checked={data.termsAccepted}
          onChange={e => update({ termsAccepted: e.target.checked })}
        />
        <span style={errors.termsAccepted ? { color: '#ef4444' } : undefined}>{t('wizard.stepC.termsText')}</span>
      </CheckboxRow>
      {errors.termsAccepted && <ErrorText>{errors.termsAccepted}</ErrorText>}
    </div>
  );
};
