import React, { useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { Input } from '../../../../components/ui/Input/Input';
import { StepBData, TeamMember } from './types';
import { FOUNDER_ROLES, MAX_TEAM_MEMBERS } from './constants';

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
  min-height: 60px;
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

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
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
    $error ? theme.colors.status.danger : $isOpen ? theme.colors.accent.primary : theme.colors.border.input};
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

const MemberCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  margin-bottom: 8px;
`;

const MemberHeader = styled.div`
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

const NumberInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme, $error }) =>
    $error ? theme.colors.status.danger : theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  &:focus {
    outline: none;
    border-color: ${({ theme, $error }) =>
      $error ? theme.colors.status.danger : theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

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

interface StepBProps {
  data: StepBData;
  onChange: (data: StepBData) => void;
  errors?: Record<string, string>;
  onClearError?: (field: string) => void;
}

export const StepB: React.FC<StepBProps> = ({ data, onChange, errors = {}, onClearError }) => {
  const { t } = useTranslation();

  const update = (partial: Partial<StepBData>) => {
    onChange({ ...data, ...partial });
    if (onClearError) {
      Object.keys(partial).forEach(k => onClearError(k));
    }
  };
  const roleItems = FOUNDER_ROLES.map(r => ({ value: r.value, label: t(r.labelKey) }));

  const addMember = (type: 'cofounder' | 'member') => {
    if (data.teamMembers.length >= MAX_TEAM_MEMBERS) return;
    update({
      teamMembers: [
        ...data.teamMembers,
        { firstName: '', lastName: '', role: '', email: '', phone: '', background: '', type },
      ],
    });
  };

  const updateMember = (idx: number, partial: Partial<TeamMember>) => {
    const updated = data.teamMembers.map((m, i) => (i === idx ? { ...m, ...partial } : m));
    update({ teamMembers: updated });
    if (onClearError) {
      Object.keys(partial).forEach(k => onClearError(`tm_${idx}_${k}`));
    }
  };

  const removeMember = (idx: number) => {
    update({ teamMembers: data.teamMembers.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <SectionTitle>{t('wizard.stepB.founderInfo')}</SectionTitle>

      <TwoCol>
        <Input
          label={t('wizard.stepB.firstName')}
          placeholder={t('wizard.stepB.firstNamePlaceholder')}
          value={data.firstName}
          onChange={e => update({ firstName: e.target.value })}
          required
          error={errors.firstName}
        />
        <Input
          label={t('wizard.stepB.lastName')}
          placeholder={t('wizard.stepB.lastNamePlaceholder')}
          value={data.lastName}
          onChange={e => update({ lastName: e.target.value })}
          required
          error={errors.lastName}
        />
      </TwoCol>

      <TwoCol>
        <FieldGroup>
          <Label $required>{t('wizard.stepB.role')}</Label>
          <Dropdown
            items={roleItems}
            value={data.role}
            onChange={v => update({ role: v })}
            placeholder="—"
            error={!!errors.role}
          />
          {errors.role && <ErrorText>{errors.role}</ErrorText>}
        </FieldGroup>
        {data.role === 'Other' && (
          <Input
            label={t('wizard.stepB.customRole')}
            value={data.customRole || ''}
            onChange={e => update({ customRole: e.target.value })}
          />
        )}
      </TwoCol>

      <TwoCol>
        <Input
          label={t('wizard.stepB.email')}
          placeholder="email@example.com"
          type="email"
          value={data.email}
          onChange={e => update({ email: e.target.value })}
          required
          error={errors.email}
        />
        <Input
          label={t('wizard.stepB.phone')}
          placeholder="+998 90 123 45 67"
          value={data.phone}
          onChange={e => update({ phone: e.target.value })}
          required
          error={errors.phone}
        />
      </TwoCol>

      <TwoCol>
        <Input
          label={t('wizard.stepB.website')}
          placeholder="https://..."
          value={data.website || ''}
          onChange={e => update({ website: e.target.value })}
        />
        <Input
          label={t('wizard.stepB.linkedin')}
          placeholder="https://linkedin.com/in/..."
          value={data.socialLinks.linkedin || ''}
          onChange={e => update({ socialLinks: { ...data.socialLinks, linkedin: e.target.value } })}
        />
      </TwoCol>

      <FieldGroup>
        <Label $required>{t('wizard.stepB.background')}</Label>
        <Textarea
          rows={2}
          placeholder={t('wizard.stepB.backgroundPlaceholder')}
          value={data.background}
          onChange={e => update({ background: e.target.value })}
        />
        {errors.background && <ErrorText>{errors.background}</ErrorText>}
      </FieldGroup>

      <FieldGroup>
        <Label>{t('wizard.stepB.successfulProject')}</Label>
        <Textarea
          rows={2}
          placeholder={t('wizard.stepB.successfulProjectPlaceholder')}
          value={data.successfulProject || ''}
          onChange={e => update({ successfulProject: e.target.value })}
        />
      </FieldGroup>

      <SectionTitle>{t('wizard.stepB.teamMembers')}</SectionTitle>

      {data.teamMembers.map((member, idx) => (
        <MemberCard key={idx}>
          <MemberHeader>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
              {member.type === 'cofounder' ? t('wizard.stepB.cofounder') : t('wizard.stepB.member')} #{
                data.teamMembers.filter((m, i) => i <= idx && m.type === member.type).length
              }
            </span>
            <DeleteBtn type="button" onClick={() => removeMember(idx)}>
              <Trash2 size={14} />
            </DeleteBtn>
          </MemberHeader>
          <TwoCol>
            <FieldGroup>
              <Label $required>{t('wizard.stepB.firstName')}</Label>
              <NumberInput
                type="text"
                value={member.firstName}
                onChange={e => updateMember(idx, { firstName: e.target.value })}
                $error={!!errors[`tm_${idx}_firstName`]}
              />
              {errors[`tm_${idx}_firstName`] && <ErrorText>{errors[`tm_${idx}_firstName`]}</ErrorText>}
            </FieldGroup>
            <FieldGroup>
              <Label $required>{t('wizard.stepB.lastName')}</Label>
              <NumberInput
                type="text"
                value={member.lastName}
                onChange={e => updateMember(idx, { lastName: e.target.value })}
                $error={!!errors[`tm_${idx}_lastName`]}
              />
              {errors[`tm_${idx}_lastName`] && <ErrorText>{errors[`tm_${idx}_lastName`]}</ErrorText>}
            </FieldGroup>
          </TwoCol>
          <ThreeCol>
            <FieldGroup>
              <Label $required>{t('wizard.stepB.role')}</Label>
              <Dropdown
                items={roleItems}
                value={member.role}
                onChange={v => updateMember(idx, { role: v })}
                placeholder="—"
                error={!!errors[`tm_${idx}_role`]}
              />
              {errors[`tm_${idx}_role`] && <ErrorText>{errors[`tm_${idx}_role`]}</ErrorText>}
            </FieldGroup>
            <FieldGroup>
              <Label>{t('wizard.stepB.email')}</Label>
              <NumberInput
                type="text"
                value={member.email}
                onChange={e => updateMember(idx, { email: e.target.value })}
                placeholder="email@example.com"
              />
            </FieldGroup>
            <FieldGroup>
              <Label>{t('wizard.stepB.phone')}</Label>
              <NumberInput
                type="text"
                value={member.phone}
                onChange={e => updateMember(idx, { phone: e.target.value })}
                placeholder="+998..."
              />
            </FieldGroup>
          </ThreeCol>
          <FieldGroup>
            <Label>{t('wizard.stepB.background')}</Label>
            <Textarea
              rows={1}
              value={member.background}
              onChange={e => updateMember(idx, { background: e.target.value })}
              placeholder={t('wizard.stepB.backgroundPlaceholder')}
            />
          </FieldGroup>
        </MemberCard>
      ))}

      {data.teamMembers.length < MAX_TEAM_MEMBERS && (
        <div style={{ display: 'flex', gap: 8 }}>
          <AddBtn type="button" onClick={() => addMember('cofounder')} style={{ flex: 1 }}>
            <Plus size={14} /> {t('wizard.stepB.addCofounder')}
          </AddBtn>
          <AddBtn type="button" onClick={() => addMember('member')} style={{ flex: 1 }}>
            <Plus size={14} /> {t('wizard.stepB.addMember')}
          </AddBtn>
        </div>
      )}
    </div>
  );
};
