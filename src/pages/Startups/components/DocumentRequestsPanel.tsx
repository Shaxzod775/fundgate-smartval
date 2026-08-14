import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileCheck2, FileText, RotateCcw, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Startup } from '../../../types';
import {
  startupsApi,
  openCrmFile,
  safeCrmFileHref,
  type DocumentItemStatus,
  type DocumentRequest,
  type DocumentRequestItem,
  type DocumentRequestTemplate,
  type StartupDocumentFile,
} from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { fileNameFromUrl } from '../../../utils/crmFileUrl';
import { formatMonthYear, formatShortDate } from '../../../utils/formatDate';

type DocumentTemplateItemDefinition = DocumentRequestTemplate['items'][number];

const DOCUMENT_ITEMS: Record<string, DocumentTemplateItemDefinition> = {
  pitch_deck: { id: 'pitch_deck', title: 'Pitch deck', description: 'Инвесторская презентация в PDF/PPT', required: true, category: 'presentation', acceptedFormats: 'PDF, PPT' },
  one_pager: { id: 'one_pager', title: 'One-pager', description: 'Краткое описание проекта на 1 страницу', required: true, category: 'presentation', acceptedFormats: 'PDF, DOC/DOCX' },
  video_pitch: { id: 'video_pitch', title: 'Видео pitch', description: 'Ссылка на видео-презентацию', required: true, category: 'presentation', inputType: 'url', acceptedFormats: 'URL' },
  financial_model: { id: 'financial_model', title: 'Финансовая модель / прогноз', description: 'Финансовая модель или прогноз выручки для заявки; условно для Pre-seed+.', required: false, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  registration_certificate: { id: 'registration_certificate', title: 'Свидетельство о регистрации', description: 'Документ по каждому юрлицу и стране регистрации', required: true, category: 'legal', requiresCountry: true, acceptedFormats: 'PDF, DOC/DOCX' },
  charter: { id: 'charter', title: 'Устав / Charter', description: 'Устав или локальный аналог по каждому юрлицу', required: true, category: 'legal', requiresCountry: true, acceptedFormats: 'PDF, DOC/DOCX' },
  shareholders_register: { id: 'shareholders_register', title: 'Shareholders Register', description: 'Актуальный реестр акционеров/участников', required: true, category: 'legal', requiresCountry: true, acceptedFormats: 'PDF, XLS/XLSX' },
  shareholders_agreement: { id: 'shareholders_agreement', title: 'Shareholders Agreement', description: 'Соглашение акционеров/участников, если есть', required: true, category: 'legal', requiresCountry: true, acceptedFormats: 'PDF, DOC/DOCX' },
  financial_statements: { id: 'financial_statements', title: 'Финансовая отчётность', description: 'P&L, Balance Sheet и Cash Flow: Excel + версии, сдаваемые в налоговые органы', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  pnl_statement: { id: 'pnl_statement', title: 'P&L за 2-3 года', description: 'Отчёт о прибылях и убытках за последние 2-3 года; обязателен для Pre-seed+.', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  balance_sheet: { id: 'balance_sheet', title: 'Balance Sheet за 2-3 года', description: 'Баланс за последние 2-3 года; обязателен для Pre-seed+.', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  cash_flow_statement: { id: 'cash_flow_statement', title: 'Cash Flow Statement за 2-3 года', description: 'Отчёт о движении денежных средств за последние 2-3 года; обязателен для Pre-seed+.', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  revenue_forecast: { id: 'revenue_forecast', title: 'Прогноз выручки 1-3 года', description: 'Прогноз выручки и ключевых драйверов роста на 1-3 года.', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  cap_table_excel: { id: 'cap_table_excel', title: 'Cap Table (детальный)', description: 'Структура владения Founders / Investors / ESOP', required: true, category: 'investment', acceptedFormats: 'XLS/XLSX' },
  use_of_funds: { id: 'use_of_funds', title: 'Use of Funds', description: 'План использования инвестиций', required: true, category: 'investment', acceptedFormats: 'XLS/XLSX, PDF' },
  past_investments_report: { id: 'past_investments_report', title: 'Отчёт о потраченных прошлых инвестициях', description: 'Условно: если у компании уже были инвестиции.', required: false, category: 'investment', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  market_sources: { id: 'market_sources', title: 'Источники данных по рынку', description: 'TAM/SAM/SOM research и ссылки на рыночные источники.', required: false, category: 'traction', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX, URL' },
  bank_statements: { id: 'bank_statements', title: 'Банковские выписки', description: 'Выписки по операционным счетам за последние 6-12 месяцев', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'PDF, XLS/XLSX' },
  unit_economics: { id: 'unit_economics', title: 'Расчёты unit economics', description: 'Excel-расчёты CAC, LTV, churn, gross margin и payback', required: true, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX' },
  consolidated_financials: { id: 'consolidated_financials', title: 'Консолидированная отчётность', description: 'Условно: если у стартапа больше одного юрлица', required: false, category: 'financial', requiresCountry: true, acceptedFormats: 'XLS/XLSX, PDF' },
  product_roadmap: { id: 'product_roadmap', title: 'Roadmap продукта', description: 'План развития продукта и ключевые milestones.', required: true, category: 'other', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  tech_stack: { id: 'tech_stack', title: 'Технологический стек', description: 'Описание архитектуры, ключевых технологий и инфраструктуры.', required: true, category: 'other', acceptedFormats: 'PDF, DOC/DOCX' },
  competitors_moat: { id: 'competitors_moat', title: 'Список конкурентов + MOAT', description: 'Прямые конкуренты и анализ защитимости / competitive moat.', required: true, category: 'traction', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  customer_contracts: { id: 'customer_contracts', title: 'Контракты / интеграции с клиентами', description: 'Ключевые договоры, LOI, интеграции или подтверждения traction.', required: true, category: 'traction', acceptedFormats: 'PDF, DOC/DOCX' },
  client_cases: { id: 'client_cases', title: 'Кейсы крупнейших клиентов', description: 'Опционально: кейсы, отзывы или результаты по крупнейшим клиентам.', required: false, category: 'traction', acceptedFormats: 'PDF, DOC/DOCX' },
  risk_map: { id: 'risk_map', title: 'Карта рисков + план митигации', description: 'Основные бизнес, legal, tech и execution риски с планом снижения.', required: true, category: 'other', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  ip_docs: { id: 'ip_docs', title: 'Патенты / авторские права', description: 'Опционально: IP, лицензии, патенты, авторские права.', required: false, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  compliance_certificates: { id: 'compliance_certificates', title: 'Сертификаты ISO / GDPR / SOC2', description: 'Опционально: сертификаты соответствия и безопасности.', required: false, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  traction_report: { id: 'traction_report', title: 'Отчёт по traction', description: 'Ключевые метрики роста, клиенты, выручка и динамика.', required: true, category: 'traction', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  roadmap: { id: 'roadmap', title: 'Roadmap на 12-18 месяцев', description: 'План продукта и бизнеса на 12-18 месяцев', required: false, category: 'other', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX' },
  shareholder_approval: { id: 'shareholder_approval', title: 'Одобрение сделки учредителями', required: true, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  investment_agreement_esign: { id: 'investment_agreement_esign', title: 'E-sign договора инвестирования', description: 'Подписанный договор инвестирования или подтверждение e-sign.', required: true, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  bank_details: { id: 'bank_details', title: 'Банковские реквизиты', required: true, category: 'financial', acceptedFormats: 'PDF, DOC/DOCX' },
  tax_certificate: { id: 'tax_certificate', title: 'Налоговая справка', required: false, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  legal_disputes: { id: 'legal_disputes', title: 'Сведения о судебных спорах', required: false, category: 'legal', acceptedFormats: 'PDF, DOC/DOCX' },
  other_documents: { id: 'other_documents', title: 'Другие документы', description: 'Дополнительные файлы для due diligence', required: false, category: 'other', acceptedFormats: 'PDF, DOC/DOCX, XLS/XLSX, PPT' },
};

const templateItems = (ids: string[]): DocumentTemplateItemDefinition[] => ids.map((id) => DOCUMENT_ITEMS[id]).filter(Boolean);

const FUNDGATE_FULL_ITEM_IDS = [
  'pitch_deck',
  'one_pager',
  'video_pitch',
  'financial_model',
  'registration_certificate',
  'charter',
  'shareholders_register',
  'shareholders_agreement',
  'pnl_statement',
  'balance_sheet',
  'cash_flow_statement',
  'revenue_forecast',
  'cap_table_excel',
  'use_of_funds',
  'past_investments_report',
  'market_sources',
  'bank_statements',
  'unit_economics',
  'consolidated_financials',
  'product_roadmap',
  'tech_stack',
  'competitors_moat',
  'customer_contracts',
  'client_cases',
  'risk_map',
  'ip_docs',
  'compliance_certificates',
  'investment_agreement_esign',
];

const FALLBACK_TEMPLATES: DocumentRequestTemplate[] = [
  {
    id: 'basic',
    title: 'Полный пакет документов стартапа',
    items: templateItems(['pitch_deck', 'one_pager', 'video_pitch', 'financial_model', 'registration_certificate', 'charter', 'shareholders_register', 'shareholders_agreement', 'financial_statements', 'cap_table_excel', 'bank_statements', 'unit_economics', 'consolidated_financials']),
  },
  {
    id: 'fundgate_full',
    title: 'Все документы FundGate',
    items: templateItems(FUNDGATE_FULL_ITEM_IDS),
  },
  {
    id: 'investment_memo',
    title: 'Инвест-мемо',
    items: templateItems(['pnl_statement', 'balance_sheet', 'cash_flow_statement', 'revenue_forecast', 'cap_table_excel', 'use_of_funds', 'past_investments_report', 'market_sources']),
  },
  {
    id: 'due_diligence',
    title: 'Due diligence',
    items: templateItems(['financial_statements', 'cap_table_excel', 'registration_certificate', 'charter', 'shareholders_register', 'shareholders_agreement', 'bank_statements', 'unit_economics', 'consolidated_financials', 'product_roadmap', 'tech_stack', 'competitors_moat', 'customer_contracts', 'client_cases', 'risk_map', 'ip_docs', 'compliance_certificates', 'other_documents']),
  },
  {
    id: 'investment_committee',
    title: 'Инвестиционный комитет',
    items: templateItems(['pitch_deck', 'one_pager', 'financial_statements', 'traction_report', 'use_of_funds', 'roadmap', 'risk_map', 'other_documents']),
  },
  {
    id: 'closing',
    title: 'Closing / Legal',
    items: templateItems(['registration_certificate', 'charter', 'shareholders_register', 'shareholders_agreement', 'shareholder_approval', 'investment_agreement_esign', 'bank_details', 'tax_certificate', 'legal_disputes', 'other_documents']),
  },
];

const Panel = styled.div`
  margin-bottom: 28px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.4px;

  svg {
    width: 16px;
    height: 16px;
    color: #38bdf8;
  }
`;

const Hint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ReviewNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.08);
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    width: 16px;
    height: 16px;
    color: #f59e0b;
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const ReviewNoticeTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
`;

const ReviewNoticeText = styled.div`
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const RequestBox = styled.div`
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
`;

const PanelSubhead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const PanelSubheadTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const PanelSubheadMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
`;

const UploadedSummary = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.18);
  background: rgba(16, 185, 129, 0.055);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

const UploadedSummaryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;

  svg {
    width: 14px;
    height: 14px;
    color: #10b981;
  }
`;

const UploadedSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
`;

const UploadedSummaryLink = styled.a`
  min-width: 0;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  border-radius: 9px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    border-color: rgba(16, 185, 129, 0.35);
    background: rgba(16, 185, 129, 0.08);
  }

  svg {
    width: 14px;
    height: 14px;
    color: #10b981;
  }
`;

const UploadedSummaryText = styled.div`
  min-width: 0;
`;

const UploadedSummaryName = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UploadedSummaryMeta = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const DropdownRoot = styled.div`
  position: relative;
  min-width: 0;
`;

const DropdownTrigger = styled.button<{ $isOpen?: boolean; $placeholder?: boolean }>`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme, $placeholder }) => ($placeholder ? theme.colors.text.tertiary : theme.colors.text.primary)};
  border: 1px solid ${({ theme, $isOpen }) => ($isOpen ? 'rgba(56, 189, 248, 0.45)' : theme.colors.border.primary)};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 43px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: rgba(56, 189, 248, 0.35);
    background: rgba(255, 255, 255, 0.055);
  }

  &:focus-visible {
    border-color: rgba(56, 189, 248, 0.55);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const DropdownMenu = styled.div<{ $align?: 'left' | 'right'; $wide?: boolean }>`
  position: absolute;
  z-index: 220;
  top: calc(100% + 6px);
  ${({ $align }) => ($align === 'right' ? 'right: 0;' : 'left: 0;')}
  width: 100%;
  min-width: ${({ $wide }) => ($wide ? '304px' : '100%')};
  max-width: min(360px, calc(100vw - 32px));
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(56, 189, 248, 0.06);
`;

const DropdownOption = styled.button<{ $selected?: boolean }>`
  width: 100%;
  border: 0;
  background: ${({ $selected }) => ($selected ? 'rgba(56, 189, 248, 0.12)' : 'transparent')};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  padding: 10px 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  svg {
    width: 15px;
    height: 15px;
    color: ${({ $selected }) => ($selected ? '#38bdf8' : 'transparent')};
  }
`;

const DateMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 2px 8px;
`;

const MonthButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.text.secondary};
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: rgba(255, 255, 255, 0.08);
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

const MonthLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 8px;
`;

const PresetButton = styled.button`
  border: 1px solid rgba(56, 189, 248, 0.18);
  background: rgba(56, 189, 248, 0.08);
  color: #7dd3fc;
  border-radius: 8px;
  padding: 7px 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(56, 189, 248, 0.14);
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const Weekday = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  padding: 4px 0;
`;

const DayButton = styled.button<{ $isCurrentMonth?: boolean; $selected?: boolean; $isToday?: boolean }>`
  border: 1px solid ${({ $selected, $isToday }) => (
    $selected ? 'rgba(56, 189, 248, 0.65)' : $isToday ? 'rgba(245, 158, 11, 0.35)' : 'transparent'
  )};
  background: ${({ $selected, $isToday }) => (
    $selected ? 'rgba(56, 189, 248, 0.2)' : $isToday ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
  )};
  color: ${({ theme, $isCurrentMonth, $selected }) => (
    $selected ? '#7dd3fc' : $isCurrentMonth ? theme.colors.text.primary : theme.colors.text.tertiary
  )};
  border-radius: 8px;
  height: 32px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ClearDateButton = styled.button`
  width: 100%;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 600;
  padding: 7px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 58px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  outline: none;
`;

const Checklist = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-gutter: stable;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 999px;
  }
`;

const CheckRow = styled.label<{ $muted?: boolean }>`
  display: grid;
  grid-template-columns: 18px 1fr auto;
  align-items: start;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: ${({ $muted }) => ($muted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.04)')};
  opacity: ${({ $muted }) => ($muted ? 0.7 : 1)};
  cursor: pointer;
`;

const CheckText = styled.div`
  min-width: 0;
`;

const CheckTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 600;
`;

const CheckDesc = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  line-height: 1.4;
  margin-top: 2px;
`;

const RequiredPill = styled.span`
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 700;
`;

const GroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 12px 2px 2px;

  &:first-child {
    margin-top: 2px;
  }

  svg {
    width: 12px;
    height: 12px;
    color: #10b981;
  }
`;

const PrimaryButton = styled.button`
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #10b981;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const GhostButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`;

const RequestCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.035);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
`;

const RequestHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const RequestTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  margin-top: 4px;
`;

const ItemRow = styled.div`
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const ItemTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
`;

const ItemTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 600;
`;

const Files = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
`;

const FileLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #38bdf8;
  font-size: 12px;
  text-decoration: none;
  word-break: break-all;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const ExistingFiles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 7px;
`;

const ExistingFile = styled.a`
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  color: #7dd3fc;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  overflow: hidden;

  &:hover {
    color: #bae6fd;
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ExistingFileMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const StatusPill = styled.span<{ $status: DocumentItemStatus | DocumentRequest['status'] }>`
  color: ${({ $status }) => {
    if ($status === 'approved' || $status === 'completed') return '#10b981';
    if ($status === 'uploaded' || $status === 'submitted') return '#38bdf8';
    if ($status === 'changes_requested') return '#f59e0b';
    return 'rgba(255,255,255,0.62)';
  }};
  background: ${({ $status }) => {
    if ($status === 'approved' || $status === 'completed') return 'rgba(16,185,129,0.12)';
    if ($status === 'uploaded' || $status === 'submitted') return 'rgba(56,189,248,0.12)';
    if ($status === 'changes_requested') return 'rgba(245,158,11,0.12)';
    return 'rgba(255,255,255,0.07)';
  }};
  border: 1px solid ${({ $status }) => {
    if ($status === 'approved' || $status === 'completed') return 'rgba(16,185,129,0.25)';
    if ($status === 'uploaded' || $status === 'submitted') return 'rgba(56,189,248,0.25)';
    if ($status === 'changes_requested') return 'rgba(245,158,11,0.25)';
    return 'rgba(255,255,255,0.1)';
  }};
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const Empty = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  text-align: center;
  padding: 18px 0 8px;
`;

const ErrorText = styled.div`
  color: #f87171;
  font-size: 12px;
`;

const CooldownNotice = styled.div`
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
`;

const ModalCard = styled.div`
  width: min(420px, 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.bg.card};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
  padding: 22px;
`;

const ModalIcon = styled.div<{ $tone: 'success' | 'warning' }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => ($tone === 'success' ? '#10b981' : '#f59e0b')};
  background: ${({ $tone }) => (
    $tone === 'success'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(245, 158, 11, 0.14)'
  )};
  margin-bottom: 14px;

  svg {
    width: 22px;
    height: 22px;
  }
`;

const ModalTitle = styled.h3`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 18px;
  font-weight: 700;
`;

const ModalText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.55;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
`;

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

type RecordLike = Record<string, unknown>;

interface ExistingDocument {
  key: string;
  documentId: string;
  title: string;
  url: string;
  fileName: string;
  uploadedAt?: unknown;
  size?: number;
  country?: string;
}

interface ReminderModalState {
  title: string;
  text: string;
  tone: 'success' | 'warning';
}

const DOCUMENT_ALIASES: Record<string, string[]> = {
  pitch_deck: ['pitch_deck', 'pitchDeck', 'deck'],
  one_pager: ['one_pager', 'onePager', 'onepager'],
  video_pitch: ['video_pitch', 'videoPitch', 'videoLink', 'video_link'],
  financial_model: ['financial_model', 'financialModel', 'model'],
  financial_statements: ['financial_statements', 'financialStatements', 'financialReports', 'financial_model', 'financialModel'],
  pnl_statement: ['pnl_statement', 'pnl', 'profit_loss', 'profitAndLoss', 'plStatement'],
  balance_sheet: ['balance_sheet', 'balanceSheet'],
  cash_flow_statement: ['cash_flow_statement', 'cashFlowStatement', 'cashflow'],
  revenue_forecast: ['revenue_forecast', 'revenueForecast', 'forecast'],
  cap_table: ['cap_table', 'capTable', 'captable'],
  cap_table_excel: ['cap_table_excel', 'capTableExcel', 'cap_table', 'capTable', 'captable'],
  use_of_funds: ['use_of_funds', 'useOfFunds'],
  past_investments_report: ['past_investments_report', 'pastInvestmentsReport', 'previousInvestmentSpend'],
  market_sources: ['market_sources', 'marketSources', 'tamSamSom', 'marketResearch'],
  incorporation: ['incorporation', 'registration_documents', 'registrationDocuments', 'registration_certificate', 'registrationCertificate', 'charter', 'legal_docs'],
  registration_certificate: ['registration_certificate', 'registrationCertificate', 'incorporation', 'registrationDocuments'],
  charter: ['charter', 'charterUrl', 'articlesOfAssociation', 'articles_of_association'],
  shareholders_register: ['shareholders_register', 'shareholder_register', 'shareholderRegister', 'shareholdersRegister'],
  shareholders_agreement: ['shareholders_agreement', 'shareholderAgreement', 'shareholdersAgreement'],
  bank_statements: ['bank_statements', 'bankStatements'],
  unit_economics: ['unit_economics', 'unitEconomics'],
  consolidated_financials: ['consolidated_financials', 'consolidatedFinancials'],
  product_roadmap: ['product_roadmap', 'productRoadmap', 'roadmap'],
  tech_stack: ['tech_stack', 'techStack', 'technologyStack'],
  competitors_moat: ['competitors_moat', 'competitorsMoat', 'competitors', 'moat'],
  customer_contracts: ['customer_contracts', 'customerContracts', 'clientContracts', 'loi'],
  client_cases: ['client_cases', 'clientCases', 'caseStudies'],
  risk_map: ['risk_map', 'riskMap', 'riskMitigation'],
  ip_docs: ['ip_docs', 'ipDocs', 'patents', 'copyrights'],
  compliance_certificates: ['compliance_certificates', 'complianceCertificates', 'iso', 'gdpr', 'soc2'],
  investment_agreement_esign: ['investment_agreement_esign', 'investmentAgreementEsign', 'investmentAgreement', 'signedInvestmentAgreement'],
  other_documents: ['other_documents', 'otherDocuments', 'additional_documents', 'additionalDocuments'],
};

const DIRECT_DOCUMENT_FIELDS: Record<string, Array<{ title: string; keys: string[] }>> = {
  pitch_deck: [
    { title: 'Pitch deck', keys: ['pitchDeck', 'pitchDeckUrl', 'pitch_deck'] },
  ],
  one_pager: [
    { title: 'One-pager', keys: ['onePager', 'onePagerUrl', 'one_pager'] },
  ],
  video_pitch: [
    { title: 'Видео pitch', keys: ['videoPitch', 'videoPitchUrl', 'videoLink', 'video_link'] },
  ],
  financial_model: [
    { title: 'Финансовая модель', keys: ['financialModel', 'financialModelUrl', 'financial_model'] },
  ],
  financial_statements: [
    { title: 'Финансовая отчётность', keys: ['financialStatements', 'financialStatementsUrl', 'financialReports', 'financialReportsUrl', 'financialModel', 'financialModelUrl'] },
  ],
  pnl_statement: [
    { title: 'P&L', keys: ['pnlStatement', 'pnlStatementUrl', 'profitLossStatement', 'profitLossStatementUrl'] },
  ],
  balance_sheet: [
    { title: 'Balance Sheet', keys: ['balanceSheet', 'balanceSheetUrl'] },
  ],
  cash_flow_statement: [
    { title: 'Cash Flow Statement', keys: ['cashFlowStatement', 'cashFlowStatementUrl'] },
  ],
  revenue_forecast: [
    { title: 'Прогноз выручки', keys: ['revenueForecast', 'revenueForecastUrl', 'financialForecast', 'financialForecastUrl'] },
  ],
  cap_table: [
    { title: 'Cap table', keys: ['capTable', 'capTableUrl', 'cap_table'] },
  ],
  cap_table_excel: [
    { title: 'Cap Table (Excel)', keys: ['capTableExcel', 'capTableExcelUrl', 'capTable', 'capTableUrl', 'cap_table'] },
  ],
  use_of_funds: [
    { title: 'Use of Funds', keys: ['useOfFunds', 'useOfFundsUrl', 'use_of_funds'] },
  ],
  past_investments_report: [
    { title: 'Отчёт о потраченных инвестициях', keys: ['pastInvestmentsReport', 'pastInvestmentsReportUrl', 'previousInvestmentSpend', 'previousInvestmentSpendUrl'] },
  ],
  market_sources: [
    { title: 'Источники данных по рынку', keys: ['marketSources', 'marketSourcesUrl', 'tamSamSomResearch', 'tamSamSomResearchUrl'] },
  ],
  incorporation: [
    { title: 'Регистрационные документы', keys: ['incorporation', 'incorporationDocs', 'registrationDocuments', 'registrationDocumentsUrl', 'charter'] },
  ],
  registration_certificate: [
    { title: 'Сертификат о регистрации', keys: ['registrationCertificate', 'registrationCertificateUrl', 'incorporation', 'incorporationDocs', 'registrationDocumentsUrl'] },
  ],
  charter: [
    { title: 'Устав / Charter', keys: ['charter', 'charterUrl', 'articlesOfAssociation', 'articlesOfAssociationUrl'] },
  ],
  shareholders_register: [
    { title: 'Shareholders Register', keys: ['shareholdersRegister', 'shareholdersRegisterUrl', 'shareholderRegister', 'shareholderRegisterUrl'] },
  ],
  shareholders_agreement: [
    { title: 'Shareholders Agreement', keys: ['shareholdersAgreement', 'shareholdersAgreementUrl', 'shareholderAgreement', 'shareholderAgreementUrl'] },
  ],
  bank_statements: [
    { title: 'Банковские выписки', keys: ['bankStatements', 'bankStatementsUrl', 'bank_statement'] },
  ],
  unit_economics: [
    { title: 'Расчёты unit economics', keys: ['unitEconomics', 'unitEconomicsUrl', 'unitEconomicsFile'] },
  ],
  consolidated_financials: [
    { title: 'Консолидированные отчётности', keys: ['consolidatedFinancials', 'consolidatedFinancialsUrl'] },
  ],
  product_roadmap: [
    { title: 'Roadmap продукта', keys: ['productRoadmap', 'productRoadmapUrl', 'roadmap', 'roadmapUrl'] },
  ],
  tech_stack: [
    { title: 'Технологический стек', keys: ['techStack', 'techStackUrl', 'technologyStack', 'technologyStackUrl'] },
  ],
  competitors_moat: [
    { title: 'Конкуренты + MOAT', keys: ['competitorsMoat', 'competitorsMoatUrl', 'competitors', 'competitorsUrl'] },
  ],
  customer_contracts: [
    { title: 'Контракты / интеграции с клиентами', keys: ['customerContracts', 'customerContractsUrl', 'clientContracts', 'clientContractsUrl'] },
  ],
  client_cases: [
    { title: 'Кейсы клиентов', keys: ['clientCases', 'clientCasesUrl', 'caseStudies', 'caseStudiesUrl'] },
  ],
  risk_map: [
    { title: 'Карта рисков', keys: ['riskMap', 'riskMapUrl', 'riskMitigation', 'riskMitigationUrl'] },
  ],
  ip_docs: [
    { title: 'IP/патенты/авторские права', keys: ['ipDocs', 'ipDocsUrl', 'patents', 'patentsUrl'] },
  ],
  compliance_certificates: [
    { title: 'Сертификаты соответствия', keys: ['complianceCertificates', 'complianceCertificatesUrl', 'certificates', 'certificatesUrl'] },
  ],
  investment_agreement_esign: [
    { title: 'E-sign договора инвестирования', keys: ['investmentAgreementEsign', 'investmentAgreementEsignUrl', 'investmentAgreement', 'investmentAgreementUrl'] },
  ],
  other_documents: [
    { title: 'Другие документы', keys: ['otherDocuments', 'otherDocumentsUrl', 'additionalDocuments', 'additionalDocumentsUrl'] },
  ],
};

const DOCUMENT_SUMMARY_ORDER = [
  'pitch_deck',
  'one_pager',
  'video_pitch',
  'registration_certificate',
  'charter',
  'shareholders_register',
  'shareholders_agreement',
  'financial_model',
  'financial_statements',
  'pnl_statement',
  'balance_sheet',
  'cash_flow_statement',
  'revenue_forecast',
  'cap_table_excel',
  'use_of_funds',
  'past_investments_report',
  'market_sources',
  'bank_statements',
  'unit_economics',
  'consolidated_financials',
  'product_roadmap',
  'tech_stack',
  'competitors_moat',
  'customer_contracts',
  'client_cases',
  'risk_map',
  'ip_docs',
  'compliance_certificates',
  'investment_agreement_esign',
  'cap_table',
  'incorporation',
  'other_documents',
];

function asRecord(value: unknown): RecordLike {
  return value && typeof value === 'object' ? value as RecordLike : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeDocumentKey(value: string): string {
  return value.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

function getDocumentAliases(id: string): Set<string> {
  return new Set([id, ...(DOCUMENT_ALIASES[id] || [])].map(normalizeDocumentKey));
}

function matchesDocumentItem(targetId: string, sourceId?: string, sourceTitle?: string): boolean {
  const aliases = getDocumentAliases(targetId);
  if (sourceId && aliases.has(normalizeDocumentKey(sourceId))) return true;
  if (sourceTitle && aliases.has(normalizeDocumentKey(sourceTitle))) return true;
  return false;
}

function normalizeDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const record = asRecord(value);
  const seconds = record._seconds ?? record.seconds;
  if (typeof seconds === 'number') {
    return new Date(seconds * 1000);
  }
  return null;
}

function formatUploadedDate(value: unknown, language?: string): string {
  const date = normalizeDateValue(value);
  if (!date) return '';
  return formatShortDate(date, language);
}

function pickDocumentUrl(sources: RecordLike[], key: string): string | undefined {
  for (const source of sources) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return undefined;
}

function currentFilesByCountry(files: StartupDocumentFile[], requiresCountry = false): StartupDocumentFile[] {
  if (!files.length) return [];
  if (!requiresCountry) return [files[files.length - 1]];

  const current = new Map<string, StartupDocumentFile>();
  files.forEach((file) => {
    const country = file.country?.trim().toLowerCase() || '__default__';
    current.set(country, file);
  });
  const namedCountries = [...current.entries()].filter(([country]) => country !== '__default__');
  return namedCountries.length > 0 ? namedCountries.map(([, file]) => file) : [...current.values()];
}

function latestDocumentsByTypeAndCountry(docs: ExistingDocument[]): ExistingDocument[] {
  const byType = new Map<string, ExistingDocument[]>();
  docs.forEach((doc) => byType.set(doc.documentId, [...(byType.get(doc.documentId) || []), doc]));

  const latest = (items: ExistingDocument[]) => items.reduce((current, candidate) => {
    const currentTime = normalizeDateValue(current.uploadedAt)?.getTime() || 0;
    const candidateTime = normalizeDateValue(candidate.uploadedAt)?.getTime() || 0;
    return candidateTime >= currentTime ? candidate : current;
  });

  return [...byType.values()].flatMap((items) => {
    const countryGroups = new Map<string, ExistingDocument[]>();
    items.forEach((doc) => {
      const country = doc.country?.trim().toLowerCase() || '__default__';
      countryGroups.set(country, [...(countryGroups.get(country) || []), doc]);
    });
    const namedCountries = [...countryGroups.entries()].filter(([country]) => country !== '__default__');
    if (namedCountries.length > 0) return namedCountries.map(([, entries]) => latest(entries));
    return [latest(countryGroups.get('__default__') || items)];
  });
}

function collectExistingDocuments(
  startup: Startup,
  item: Pick<DocumentRequestItem, 'id' | 'title'>,
): ExistingDocument[] {
  const docs: ExistingDocument[] = [];
  const seen = new Set<string>();
  const startupRecord = startup as unknown as RecordLike;
  const fileUrls = asRecord(startup.fileUrls);
  const brief = asRecord(startup.brief);
  const materials = asRecord(startup.materials);
  const sourceDate = startupRecord.submittedAt || startup.createdAt || startup.updatedAt;

  const addDocument = (doc: ExistingDocument) => {
    const key = doc.url || doc.key;
    if (!key || seen.has(key)) return;
    seen.add(key);
    docs.push(doc);
  };

  for (const field of DIRECT_DOCUMENT_FIELDS[item.id] || []) {
    for (const key of field.keys) {
      const url = pickDocumentUrl([fileUrls, brief, materials, startupRecord], key);
      if (!url) continue;
      addDocument({
        key: `${item.id}:${key}:${url}`,
        documentId: item.id,
        title: field.title,
        url,
        fileName: fileNameFromUrl(url, field.title),
        uploadedAt: sourceDate,
      });
    }
  }

  for (const request of startup.documentRequests || []) {
    for (const requestItem of request.items || []) {
      if (!matchesDocumentItem(item.id, requestItem.id, requestItem.title)) continue;
      for (const file of currentFilesByCountry(requestItem.files || [], Boolean(requestItem.requiresCountry))) {
        const uploadedFile = file as StartupDocumentFile;
        addDocument({
          key: `${item.id}:${uploadedFile.id || uploadedFile.storagePath || uploadedFile.url}`,
          documentId: item.id,
          title: requestItem.title || item.title,
          url: uploadedFile.url,
          fileName: uploadedFile.fileName || fileNameFromUrl(uploadedFile.url, requestItem.title || item.title),
          uploadedAt: uploadedFile.uploadedAt || request.updatedAt || request.createdAt,
          size: uploadedFile.size,
          country: uploadedFile.country,
        });
      }
    }
  }

  return latestDocumentsByTypeAndCountry(docs);
}

function collectUploadedDocumentsSummary(startup: Startup): ExistingDocument[] {
  const docs: ExistingDocument[] = [];
  const seen = new Set<string>();

  const addDocs = (items: ExistingDocument[]) => {
    for (const doc of items) {
      const key = doc.url || doc.key;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      docs.push(doc);
    }
  };

  for (const id of DOCUMENT_SUMMARY_ORDER) {
    addDocs(collectExistingDocuments(startup, { id, title: id }));
  }

  for (const request of startup.documentRequests || []) {
    for (const item of request.items || []) {
      for (const file of item.files || []) {
        addDocs([{
          key: `${item.id}:${file.id || file.storagePath || file.url}`,
          documentId: item.id,
          title: item.title,
          url: file.url,
          fileName: file.fileName || fileNameFromUrl(file.url, item.title),
          uploadedAt: file.uploadedAt || request.updatedAt || request.createdAt,
          size: file.size,
          country: file.country,
        }]);
      }
    }
  }

  return latestDocumentsByTypeAndCountry(docs);
}

function documentMetaLine(
  item: Pick<DocumentRequestItem, 'inputType' | 'acceptedFormats' | 'requiresCountry'>,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (item.inputType === 'url') parts.push(t('documentRequests.meta.link'));
  if (item.acceptedFormats) parts.push(item.acceptedFormats);
  if (item.requiresCountry) parts.push(t('documentRequests.meta.countryRequired'));
  return parts.join(' · ');
}

function useOutsideClick(ref: { current: HTMLElement | null }, onClose: () => void) {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [ref, onClose]);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateDisplay(value: string, language?: string): string {
  const date = parseIsoDate(value);
  if (!date) return '';
  return formatShortDate(date, language);
}

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function calendarDays(viewDate: Date): Date[] {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstVisible = new Date(firstOfMonth);
  firstVisible.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    return date;
  });
}

function sameDay(a: Date | null, b: Date): boolean {
  if (!a) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function TemplateDropdown({
  templates,
  value,
  onChange,
}: {
  templates: DocumentRequestTemplate[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = templates.find((template) => template.id === value) || templates[0];
  useOutsideClick(ref, () => setOpen(false));

  return (
    <DropdownRoot ref={ref}>
      <DropdownTrigger
        type="button"
        $isOpen={open}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.title || t('documentRequests.selectPackage')}</span>
        <ChevronDown />
      </DropdownTrigger>

      {open && (
        <DropdownMenu role="listbox">
          {templates.map((template) => (
            <DropdownOption
              key={template.id}
              type="button"
              role="option"
              aria-selected={template.id === value}
              $selected={template.id === value}
              onClick={() => {
                onChange(template.id);
                setOpen(false);
              }}
            >
              <Check />
              <span>{template.title}</span>
            </DropdownOption>
          ))}
        </DropdownMenu>
      )}
    </DropdownRoot>
  );
}

function DateDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseIsoDate(value) || new Date());
  const ref = useRef<HTMLDivElement | null>(null);
  const selectedDate = parseIsoDate(value);
  const language = i18n.resolvedLanguage || i18n.language;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  useOutsideClick(ref, () => setOpen(false));

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  const chooseDate = (date: Date) => {
    onChange(toIsoDate(date));
    setOpen(false);
  };

  return (
    <DropdownRoot ref={ref}>
      <DropdownTrigger
        type="button"
        $isOpen={open}
        $placeholder={!value}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{formatDateDisplay(value, language) || t('documentRequests.datePlaceholder')}</span>
        <CalendarDays />
      </DropdownTrigger>

      {open && (
        <DropdownMenu $align="right" $wide role="dialog" aria-label={t('documentRequests.deadlinePicker')}>
          <PresetGrid>
            {[3, 7, 14, 30].map((days) => (
              <PresetButton key={days} type="button" onClick={() => chooseDate(addDays(days))}>
                {t('documentRequests.inDays', { count: days })}
              </PresetButton>
            ))}
          </PresetGrid>

          <DateMenuHeader>
            <MonthButton
              type="button"
              aria-label={t('documentRequests.previousMonth')}
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            >
              <ChevronLeft />
            </MonthButton>
            <MonthLabel>
              {formatMonthYear(viewDate, language)}
            </MonthLabel>
            <MonthButton
              type="button"
              aria-label={t('documentRequests.nextMonth')}
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            >
              <ChevronRight />
            </MonthButton>
          </DateMenuHeader>

          <CalendarGrid>
            {[
              t('documentRequests.weekdays.mon'),
              t('documentRequests.weekdays.tue'),
              t('documentRequests.weekdays.wed'),
              t('documentRequests.weekdays.thu'),
              t('documentRequests.weekdays.fri'),
              t('documentRequests.weekdays.sat'),
              t('documentRequests.weekdays.sun'),
            ].map((day) => (
              <Weekday key={day}>{day}</Weekday>
            ))}
            {calendarDays(viewDate).map((date) => (
              <DayButton
                key={toIsoDate(date)}
                type="button"
                $isCurrentMonth={date.getMonth() === viewDate.getMonth()}
                $selected={sameDay(selectedDate, date)}
                $isToday={sameDay(today, date)}
                onClick={() => chooseDate(date)}
              >
                {date.getDate()}
              </DayButton>
            ))}
          </CalendarGrid>

          {value && (
            <ClearDateButton type="button" onClick={() => { onChange(''); setOpen(false); }}>
              {t('documentRequests.clearDeadline')}
            </ClearDateButton>
          )}
        </DropdownMenu>
      )}
    </DropdownRoot>
  );
}

interface Props {
  startup: Startup;
  onStartupUpdate?: (startup: Startup) => void;
  canModify?: boolean;
}

export function DocumentRequestsPanel({ startup, onStartupUpdate, canModify = true }: Props) {
  const { manager } = useAuth();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const templates: DocumentRequestTemplate[] = useMemo(() => (
    FALLBACK_TEMPLATES.map((template) => ({
      ...template,
      title: t(`documentRequests.templates.${template.id}.title`, { defaultValue: template.title }),
      items: template.items.map((item) => ({
        ...item,
        title: t(`documentRequests.items.${item.id}.title`, { defaultValue: item.title }),
        description: item.description
          ? t(`documentRequests.items.${item.id}.description`, { defaultValue: item.description })
          : undefined,
      })),
    }))
  ), [t, i18n.language]);
  const [templateId, setTemplateId] = useState(FALLBACK_TEMPLATES[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reminderModal, setReminderModal] = useState<ReminderModalState | null>(null);

  const currentTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) || templates[0],
    [templates, templateId],
  );
  const { missingItems, providedItems } = useMemo(() => {
    const missing: DocumentTemplateItemDefinition[] = [];
    const provided: DocumentTemplateItemDefinition[] = [];
    (currentTemplate?.items || []).forEach((item) => {
      if (collectExistingDocuments(startup, item).length > 0) provided.push(item);
      else missing.push(item);
    });
    return { missingItems: missing, providedItems: provided };
  }, [currentTemplate, startup]);
  const requests = startup.documentRequests || [];
  const cooldown = useMemo(() => {
    const toMs = (value: unknown): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'string') { const t = Date.parse(value); return Number.isNaN(t) ? 0 : t; }
      const anyVal = value as { toMillis?: () => number; _seconds?: number; seconds?: number };
      if (typeof anyVal.toMillis === 'function') return anyVal.toMillis();
      if (typeof anyVal._seconds === 'number') return anyVal._seconds * 1000;
      if (typeof anyVal.seconds === 'number') return anyVal.seconds * 1000;
      return 0;
    };
    const lastMs = requests.reduce((max, r) => Math.max(max, toMs(r.createdAt)), 0);
    const until = lastMs ? lastMs + 24 * 60 * 60 * 1000 : 0;
    const active = until > Date.now();
    return { active, hoursLeft: active ? Math.max(1, Math.ceil((until - Date.now()) / 3_600_000)) : 0 };
  }, [requests]);
  const requestsNeedingReview = useMemo(
    () => requests.filter((request) => (
      request.status === 'submitted' ||
      request.items.some((item) => item.status === 'uploaded')
    )),
    [requests],
  );
  const uploadedDocuments = useMemo(() => collectUploadedDocumentsSummary(startup), [startup]);
  const localizeDocumentTitle = (doc: ExistingDocument) => {
    const id = doc.key.split(':')[0];
    return t(`documentRequests.items.${id}.title`, { defaultValue: doc.title });
  };
  const localizeRequestTitle = (request: DocumentRequest) => (
    t(`documentRequests.templates.${request.templateId}.title`, { defaultValue: request.title })
  );
  const localizeRequestItem = (item: DocumentRequestItem) => ({
    title: t(`documentRequests.items.${item.id}.title`, { defaultValue: item.title }),
    description: item.description
      ? t(`documentRequests.items.${item.id}.description`, { defaultValue: item.description })
      : undefined,
  });

  const applyRequests = (nextRequests: DocumentRequest[]) => {
    onStartupUpdate?.({ ...startup, documentRequests: nextRequests } as Startup);
  };

  const handleTemplateChange = (nextId: string) => {
    setTemplateId(nextId);
    setSelectedIds([]);
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    ));
  };

  const renderCheckRow = (item: DocumentTemplateItemDefinition, muted: boolean) => {
    const existingDocuments = collectExistingDocuments(startup, item);
    const metaLine = documentMetaLine(item, t);
    return (
      <CheckRow key={item.id} $muted={muted}>
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={() => toggleItem(item.id)}
        />
        <CheckText>
          <CheckTitle>{item.title}</CheckTitle>
          {item.description && <CheckDesc>{item.description}</CheckDesc>}
          {metaLine && <CheckDesc>{metaLine}</CheckDesc>}
          {existingDocuments.length > 0 && (
            <ExistingFiles>
              {existingDocuments.map((doc) => (
                <ExistingFile
                  key={doc.key}
                  href={safeCrmFileHref(doc.url, startup.id)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void openCrmFile(doc.url, startup.id);
                  }}
                >
                  <ExternalLink />
                  <span>{doc.fileName}</span>
                  <ExistingFileMeta>
                    {t('documentRequests.uploaded')} {formatUploadedDate(doc.uploadedAt, language) || t('documentRequests.unknownDate')}
                    {doc.size ? ` · ${formatFileSize(doc.size)}` : ''}
                    {doc.country ? ` · ${t('documentRequests.legalEntityCountry')}: ${doc.country}` : ''}
                  </ExistingFileMeta>
                </ExistingFile>
              ))}
            </ExistingFiles>
          )}
        </CheckText>
        {item.required && <RequiredPill>{t('documentRequests.requiredShort')}</RequiredPill>}
      </CheckRow>
    );
  };

  const handleCreate = async () => {
    if (!currentTemplate || !selectedIds.length) {
      setError(t('documentRequests.errors.selectAtLeastOne'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      const items = currentTemplate.items.filter((item) => selectedIds.includes(item.id));
      const response = await startupsApi.createDocumentRequest(startup.id, {
        templateId,
        title: currentTemplate.title,
        message: message.trim() || undefined,
        dueDate: dueDate || undefined,
        items,
        managerId: manager?.id,
        managerName: manager?.name,
        locale: i18n.language,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || t('documentRequests.errors.createFailed'));
      }
      applyRequests([...requests, response.data]);
      setMessage('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documentRequests.errors.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (
    requestId: string,
    item: DocumentRequestItem,
    status: DocumentItemStatus,
  ) => {
    const reviewNote = status === 'changes_requested'
      ? window.prompt(t('documentRequests.reviewPrompt')) || ''
      : '';
    if (status === 'changes_requested' && !reviewNote.trim()) return;

    setBusy(true);
    setError('');
    try {
      const response = await startupsApi.reviewDocumentRequestItem(startup.id, requestId, item.id, {
        status,
        reviewNote: reviewNote.trim() || undefined,
        managerId: manager?.id,
        managerName: manager?.name,
        locale: i18n.language,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || t('documentRequests.errors.updateFailed'));
      }
      applyRequests(requests.map((request) => (
        request.id === requestId ? response.data! : request
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documentRequests.errors.updateFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemind = async (request: DocumentRequest) => {
    setBusy(true);
    setError('');
    try {
      const response = await startupsApi.remindDocumentRequest(startup.id, request.id, {
        managerId: manager?.id,
        managerName: manager?.name,
        message: t('documentRequests.reminderMessage', {
          documents: request.items.map((item) => localizeRequestItem(item).title).join(', '),
        }),
        locale: i18n.language,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || t('documentRequests.errors.remindFailed'));
      }
      const { data } = response;
      const nextRequests = data.request
        ? requests.map((item) => (item.id === request.id ? data.request! : item))
        : requests.map((item) => (
          item.id === request.id ? { ...item, remindedAt: data.remindedAt, updatedAt: data.remindedAt } : item
        ));
      const currentComments = Array.isArray(startup.comments) ? startup.comments : [];
      onStartupUpdate?.({
        ...startup,
        documentRequests: nextRequests,
        ...(data.chatMessage ? { comments: [...currentComments, data.chatMessage] } : {}),
      } as Startup);

      let text = t('documentRequests.reminderSentMessage');
      let tone: ReminderModalState['tone'] = 'success';
      if (!data.emailSent) {
        const reason = data.emailSkippedReason === 'founder_email_missing'
          ? t('documentRequests.reminderEmailMissing')
          : t('documentRequests.reminderEmailNotSent');
        text = data.chatSent
          ? t('documentRequests.reminderChatOnlyMessage', { reason })
          : t('documentRequests.reminderNotSentMessage', { reason });
        tone = 'warning';
      } else if (!data.chatSent) {
        text = t('documentRequests.reminderEmailOnlyMessage');
        tone = 'warning';
      }
      setReminderModal({
        title: data.emailSent && data.chatSent
          ? t('documentRequests.reminderSentTitle')
          : t('documentRequests.reminderPartialTitle'),
        text,
        tone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documentRequests.errors.remindFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Header>
        <div>
          <Title><FileText /> {t('documentRequests.title')}</Title>
          <Hint>{t('documentRequests.fileHint')}</Hint>
        </div>
      </Header>

      {requestsNeedingReview.length > 0 && (
        <ReviewNotice>
          <FileCheck2 />
          <div>
            <ReviewNoticeTitle>
              {t('documentRequests.readyForReviewTitle', { count: requestsNeedingReview.length })}
            </ReviewNoticeTitle>
            <ReviewNoticeText>{t('documentRequests.readyForReviewText')}</ReviewNoticeText>
          </div>
        </ReviewNotice>
      )}

      {canModify && (
      <RequestBox>
        {uploadedDocuments.length > 0 && (
          <UploadedSummary>
            <UploadedSummaryTitle>
              <FileCheck2 /> {t('documentRequests.alreadyUploaded')}
            </UploadedSummaryTitle>
            <UploadedSummaryGrid>
              {uploadedDocuments.map((doc) => (
                <UploadedSummaryLink
                  key={doc.key}
                  href={safeCrmFileHref(doc.url, startup.id)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    void openCrmFile(doc.url, startup.id);
                  }}
                >
                  <FileText />
                  <UploadedSummaryText>
                    <UploadedSummaryName>{localizeDocumentTitle(doc)}</UploadedSummaryName>
                    <UploadedSummaryMeta>
                      {doc.fileName} · {formatUploadedDate(doc.uploadedAt, language) || t('documentRequests.unknownDate')}
                      {doc.size ? ` · ${formatFileSize(doc.size)}` : ''}
                      {doc.country ? ` · ${t('documentRequests.legalEntityCountry')}: ${doc.country}` : ''}
                    </UploadedSummaryMeta>
                  </UploadedSummaryText>
                  <ExternalLink />
                </UploadedSummaryLink>
              ))}
            </UploadedSummaryGrid>
          </UploadedSummary>
        )}

        <PanelSubhead>
          <PanelSubheadTitle>{t('documentRequests.requestMissing')}</PanelSubheadTitle>
          <PanelSubheadMeta>{t('documentRequests.requestAgainHint')}</PanelSubheadMeta>
        </PanelSubhead>

        <FieldRow>
          <TemplateDropdown
            templates={templates}
            value={templateId}
            onChange={handleTemplateChange}
          />
          <DateDropdown value={dueDate} onChange={setDueDate} />
        </FieldRow>

        <Checklist>
          {providedItems.length > 0 && missingItems.length > 0 && (
            <GroupLabel>{t('documentRequests.toRequestGroup', { defaultValue: 'To request' })}</GroupLabel>
          )}
          {missingItems.map((item) => renderCheckRow(item, false))}
          {providedItems.length > 0 && (
            <GroupLabel>
              <FileCheck2 />
              {t('documentRequests.uploadedGroup', { defaultValue: 'Already uploaded — check to request a new version' })}
            </GroupLabel>
          )}
          {providedItems.map((item) => renderCheckRow(item, true))}
        </Checklist>

        <TextArea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('documentRequests.messagePlaceholder')}
        />

        {error && <ErrorText>{error}</ErrorText>}

        {cooldown.active && (
          <CooldownNotice>{t('documentRequests.cooldownNotice', { hours: cooldown.hoursLeft })}</CooldownNotice>
        )}

        <PrimaryButton type="button" onClick={handleCreate} disabled={busy || selectedIds.length === 0 || cooldown.active}>
          <Send /> {t('documentRequests.requestDocuments')}
        </PrimaryButton>
      </RequestBox>
      )}

      {requests.length === 0 ? (
        <Empty>{t('documentRequests.empty')}</Empty>
      ) : (
        [...requests].reverse().map((request) => (
          <RequestCard key={request.id}>
            <RequestHeader>
              <div>
                <RequestTitle>{localizeRequestTitle(request)}</RequestTitle>
                <Meta>
                  {request.requestedByName || t('documentRequests.fund')}
                  {request.dueDate ? ` · ${t('documentRequests.deadline')} ${formatShortDate(new Date(request.dueDate), language)}` : ''}
                </Meta>
              </div>
              <StatusPill $status={request.status}>{t(`documentRequests.status.${request.status}`, { defaultValue: request.status })}</StatusPill>
            </RequestHeader>

            {request.message && <Meta style={{ marginBottom: 8 }}>{request.message}</Meta>}

            {request.items.map((item) => {
              const localizedItem = localizeRequestItem(item);
              const currentFiles = currentFilesByCountry(item.files || [], Boolean(item.requiresCountry));
              return (
              <ItemRow key={item.id}>
                <ItemTop>
                  <div>
                    <ItemTitle>{localizedItem.title}</ItemTitle>
                    {localizedItem.description && <Meta>{localizedItem.description}</Meta>}
                    {documentMetaLine(item, t) && <Meta>{documentMetaLine(item, t)}</Meta>}
                    {item.reviewNote && <Meta style={{ color: '#f59e0b' }}>{t('documentRequests.comment')}: {item.reviewNote}</Meta>}
                  </div>
                  <StatusPill $status={item.status}>{t(`documentRequests.status.${item.status}`, { defaultValue: item.status })}</StatusPill>
                </ItemTop>

                {currentFiles.length > 0 && (
                  <Files>
                    {currentFiles.map((file) => (
                      <div key={file.id || file.storagePath}>
                        <FileLink
                          href={safeCrmFileHref(file.url, startup.id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => {
                            event.preventDefault();
                            void openCrmFile(file.url, startup.id);
                          }}
                        >
                          <ExternalLink />
                          {file.fileName} {formatFileSize(file.size) ? `(${formatFileSize(file.size)})` : ''}
                        </FileLink>
                        <Meta>
                          {t('documentRequests.uploaded')} {formatUploadedDate(file.uploadedAt, language) || t('documentRequests.unknownDate')}
                          {file.country ? ` · ${t('documentRequests.legalEntityCountry')}: ${file.country}` : ''}
                        </Meta>
                      </div>
                    ))}
                  </Files>
                )}

                <Actions>
                  {canModify && item.status === 'uploaded' && (
                    <>
                      <GhostButton type="button" disabled={busy} onClick={() => handleReview(request.id, item, 'approved')}>
                        <CheckCircle2 /> {t('documentRequests.approve')}
                      </GhostButton>
                      <GhostButton type="button" disabled={busy} onClick={() => handleReview(request.id, item, 'changes_requested')}>
                        <RotateCcw /> {t('documentRequests.return')}
                      </GhostButton>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <GhostButton type="button" disabled>
                      <FileCheck2 /> {t('documentRequests.verified')}
                    </GhostButton>
                  )}
                </Actions>
              </ItemRow>
              );
            })}

            {canModify && request.status !== 'completed' && (
              <Actions>
                <GhostButton type="button" disabled={busy} onClick={() => handleRemind(request)}>
                  <Bell /> {t('documentRequests.remind')}
                </GhostButton>
              </Actions>
            )}
          </RequestCard>
        ))
      )}

      {reminderModal && (
        <ModalBackdrop onClick={() => setReminderModal(null)}>
          <ModalCard
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-reminder-result-title"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalIcon $tone={reminderModal.tone}>
              <CheckCircle2 />
            </ModalIcon>
            <ModalTitle id="document-reminder-result-title">{reminderModal.title}</ModalTitle>
            <ModalText>{reminderModal.text}</ModalText>
            <ModalActions>
              <PrimaryButton type="button" onClick={() => setReminderModal(null)}>
                {t('documentRequests.reminderOk')}
              </PrimaryButton>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}
    </Panel>
  );
}
