import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Building2,
  FileCheck2,
  Gauge,
  Globe2,
  Layers,
  Printer,
  Rocket,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { useAuth } from '../../contexts/AuthContext';
import { canSeePlatformReport } from './access';
import reportData from './platformReport.data.json';

type MonthlyQuality = {
  month: string;
  count: number;
  avg: number;
  median: number;
  share60: number;
  share70: number;
};

type ComponentScore = {
  code: string;
  name: string;
  max: number;
  before: number | null;
  after: number | null;
};

const PageContainer = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  container-type: inline-size;
  padding-top: ${({ theme }) => theme.spacing[6]};
  padding-bottom: ${({ theme }) => theme.spacing[10]};
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const TitleGroup = styled.div`
  min-width: 0;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  max-width: 720px;
  line-height: 1.5;
`;

const PrintButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media print {
    display: none;
  }
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  break-inside: avoid;
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
`;

const SectionHint = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
  max-width: 820px;
  line-height: 1.5;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;

  @container (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;
`;

const StatIcon = styled.div<{ $tone: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `${$tone}1f`};

  svg {
    width: 22px;
    height: 22px;
  }
`;

const StatBody = styled.div`
  min-width: 0;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.1;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 3px;
  line-height: 1.35;
`;

const HeadlineCard = styled(Card)`
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.accent.primaryLight} 0%,
    ${({ theme }) => theme.colors.bg.card} 60%
  );
  border-color: ${({ theme }) => theme.colors.accent.primaryGlow};
`;

const HeadlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[8]};
  flex-wrap: wrap;
`;

const HeadlineBlock = styled.div`
  min-width: 0;
`;

const HeadlinePeriod = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const HeadlineValue = styled.div<{ $accent?: boolean }>`
  font-size: 40px;
  font-weight: 800;
  line-height: 1.05;
  color: ${({ theme, $accent }) => ($accent ? theme.colors.accent.primary : theme.colors.text.primary)};
`;

const HeadlineMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 2px;
`;

const DeltaPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.status.successBg};
  border: 1px solid ${({ theme }) => theme.colors.status.successBorder};
  color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;

  @container (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ChartCard = styled(Card)`
  min-width: 0;
  break-inside: avoid;
`;

const ChartTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChartHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: 1.45;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  min-width: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  th,
  td {
    text-align: left;
    padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.colors.text.muted};
    font-weight: 600;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  th.num {
    text-align: right;
  }
`;

const BarRow = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 2fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const BarLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BarTrack = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $tone: string }>`
  height: 100%;
  width: ${({ $pct }) => `${Math.max($pct, 2)}%`};
  background: ${({ $tone }) => $tone};
  border-radius: inherit;
`;

const BarValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`;

const NoteCard = styled(Card)`
  border-style: dashed;
`;

const NoteList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[5]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;

  li + li {
    margin-top: ${({ theme }) => theme.spacing[2]};
  }

  strong {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const PrintArea = styled.div`
  @media print {
    color-scheme: light;
  }
`;

function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split('-');
  const index = Number(m) - 1;
  if (Number.isNaN(index) || index < 0 || index > 11) return month;
  const formatted = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(Number(year), index, 1));
  return `${formatted} ${year.slice(2)}`;
}

export default function PlatformReport() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { organization } = useAuth();
  const locale = i18n.language || 'ru';

  const { scale, quality, speed, funnel, geography, industries, tooling, funds } = reportData;

  const qualityPoints = useMemo(
    () =>
      (quality.monthly as MonthlyQuality[]).map((point) => ({
        ...point,
        label: monthLabel(point.month, locale),
      })),
    [quality.monthly, locale],
  );

  const componentPoints = useMemo(
    () =>
      (quality.components as ComponentScore[]).map((component) => ({
        code: component.code,
        label: `${component.code} · ${t(`platformReport.components.${component.name}`, component.name)}`,
        before: component.before === null ? 0 : Math.round((component.before / component.max) * 1000) / 10,
        after: component.after === null ? 0 : Math.round((component.after / component.max) * 1000) / 10,
        raw: component,
      })),
    [quality.components, t],
  );

  const channelPoints = useMemo(
    () =>
      quality.channelIframe.map((point) => ({
        ...point,
        label: monthLabel(point.month, locale),
      })),
    [quality.channelIframe, locale],
  );

  const completenessPoints = useMemo(
    () =>
      quality.completeness
        .filter((point) => point.month >= '2026-03')
        .map((point) => ({ ...point, label: monthLabel(point.month, locale) })),
    [quality.completeness, locale],
  );

  const avgBefore = quality.before.avg ?? 0;
  const avgAfter = quality.after.avg ?? 0;
  const delta = Math.round((avgAfter - avgBefore) * 10) / 10;
  const deltaPct = avgBefore ? Math.round(((avgAfter - avgBefore) / avgBefore) * 1000) / 10 : 0;

  const geoTotal = geography.reduce((sum, item) => sum + item.count, 0);
  const industryMax = industries[0]?.count ?? 1;
  const funnelTotal = funnel.reduce((sum, item) => sum + item.count, 0);

  const tooltipStyle = {
    background: theme.colors.bg.dropdown,
    border: `1px solid ${theme.colors.border.primary}`,
    borderRadius: theme.radius.md,
    color: theme.colors.text.primary,
  };

  const headlineStats = [
    {
      icon: Building2,
      tone: theme.colors.chart.blue,
      value: scale.fundsConnected,
      label: t('platformReport.stats.funds', 'Фондов подключено к платформе'),
    },
    {
      icon: Rocket,
      tone: theme.colors.chart.green,
      value: scale.uniqueStartups,
      label: t('platformReport.stats.startups', 'Уникальных стартапов подали заявку'),
    },
    {
      icon: FileCheck2,
      tone: theme.colors.chart.purple,
      value: scale.uniqueSubmissions,
      label: t('platformReport.stats.submissions', 'Уникальных подач, {{scored}} с готовой оценкой', {
        scored: scale.scoredSubmissions,
      }),
    },
    {
      icon: Layers,
      tone: theme.colors.chart.amber,
      value: scale.startupFundPairs,
      label: t('platformReport.stats.pairs', 'Карточек «стартап → фонд» в CRM фондов'),
    },
    {
      icon: Users,
      tone: theme.colors.chart.cyan,
      value: scale.fundManagers,
      label: t('platformReport.stats.managers', 'Сотрудников этих фондов работают в CRM'),
    },
    {
      icon: Sparkles,
      tone: theme.colors.chart.pink,
      value: scale.startupsInPortfolio,
      label: t('platformReport.stats.portfolio', 'Стартапов уже доведены до портфеля'),
    },
    {
      icon: Timer,
      tone: theme.colors.chart.green,
      value: speed.medianSec ? `${Math.round(speed.medianSec)} ${t('platformReport.units.sec', 'сек')}` : '—',
      label: t('platformReport.stats.speed', 'Медианное время AI-оценки одной заявки'),
    },
    {
      icon: Gauge,
      tone: theme.colors.chart.blue,
      value: scale.fundsPerStartup ?? '—',
      label: t('platformReport.stats.fundsPerStartup', 'Фонда в среднем получают одну заявку'),
    },
  ];

  if (!canSeePlatformReport(organization?.id)) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageContainer>
      <PrintArea>
        <PageHeader>
          <TitleGroup>
            <PageTitle>{t('platformReport.title', 'Отчёт по платформе FundGate')}</PageTitle>
            <PageSubtitle>
              {t(
                'platformReport.subtitle',
                'Выверенный срез по продакшн-базе: шесть фондов-партнёров с fundgate.uz, поток заявок и динамика качества заявок стартапов.',
              )}{' '}
              {t('platformReport.generatedAt', 'Данные на')} {reportData.generatedAt}.
            </PageSubtitle>
          </TitleGroup>
          <PrintButton type="button" onClick={() => window.print()}>
            <Printer />
            {t('platformReport.print', 'Печать / PDF')}
          </PrintButton>
        </PageHeader>

        <Section>
          <SectionTitle>{t('platformReport.sections.scale', 'Масштаб платформы')}</SectionTitle>
          <SectionHint>
            {t(
              'platformReport.sections.scaleHint',
              'Одна подача стартапа может уходить сразу в несколько фондов, поэтому «уникальные стартапы» и «карточки в CRM фондов» — разные цифры: первая отражает поток заявителей, вторая — объём работы, который платформа сняла с фондов. Стартапы склеиваются тем же алгоритмом, что и публичный счётчик на fundgate.uz.',
            )}
          </SectionHint>
          <StatsGrid>
            {headlineStats.map((stat) => (
              <StatCard key={stat.label}>
                <StatIcon $tone={stat.tone}>
                  <stat.icon />
                </StatIcon>
                <StatBody>
                  <StatValue>{typeof stat.value === 'number' ? stat.value.toLocaleString(locale) : stat.value}</StatValue>
                  <StatLabel>{stat.label}</StatLabel>
                </StatBody>
              </StatCard>
            ))}
          </StatsGrid>
        </Section>

        <Section>
          <SectionTitle>{t('platformReport.sections.quality', 'Качество заявок растёт')}</SectionTitle>
          <SectionHint>
            {t(
              'platformReport.sections.qualityHint',
              'Средний балл FundGate по 100-балльной шкале. Считается только по уникальным подачам с завершённым анализом — копии одной заявки в разных фондах в расчёт не берутся.',
            )}
          </SectionHint>

          <HeadlineCard>
            <HeadlineRow>
              <HeadlineBlock>
                <HeadlinePeriod>{t('platformReport.period.before', 'Апрель — июнь 2026')}</HeadlinePeriod>
                <HeadlineValue>{avgBefore.toFixed(1)}</HeadlineValue>
                <HeadlineMeta>
                  {quality.before.count} {t('platformReport.units.submissions', 'подач')}
                </HeadlineMeta>
              </HeadlineBlock>

              <DeltaPill>
                <ArrowUpRight />
                +{delta.toFixed(1)} {t('platformReport.units.points', 'балла')} ({deltaPct > 0 ? '+' : ''}
                {deltaPct.toFixed(1)}%)
              </DeltaPill>

              <HeadlineBlock>
                <HeadlinePeriod>{t('platformReport.period.after', 'Июль — август 2026')}</HeadlinePeriod>
                <HeadlineValue $accent>{avgAfter.toFixed(1)}</HeadlineValue>
                <HeadlineMeta>
                  {quality.after.count} {t('platformReport.units.submissions', 'подач')}
                </HeadlineMeta>
              </HeadlineBlock>
            </HeadlineRow>
          </HeadlineCard>

          <ChartsGrid style={{ marginTop: theme.spacing[4] }}>
            <ChartCard>
              <ChartTitle>{t('platformReport.charts.monthly', 'Средний балл по месяцам')}</ChartTitle>
              <ChartHint>
                {t(
                  'platformReport.charts.monthlyHint',
                  'Столбцы — средний балл заявки, линия — доля заявок с баллом 60+, то есть тех, что фонд готов рассматривать всерьёз.',
                )}
              </ChartHint>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={qualityPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="score" domain={[0, 100]} stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="share"
                    orientation="right"
                    domain={[0, 100]}
                    stroke={theme.colors.text.tertiary}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme.colors.text.secondary }} />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  <Bar
                    yAxisId="score"
                    dataKey="avg"
                    name={t('platformReport.charts.avgScore', 'Средний балл')}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={54}
                  >
                    {qualityPoints.map((point) => (
                      <Cell
                        key={point.month}
                        fill={point.month >= '2026-07' ? theme.colors.chart.green : theme.colors.chart.blue}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="share"
                    type="monotone"
                    dataKey="share60"
                    name={t('platformReport.charts.share60', 'Доля 60+ баллов, %')}
                    stroke={theme.colors.chart.amber}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.components', 'Где именно стало лучше')}</ChartTitle>
              <ChartHint>
                {t(
                  'platformReport.charts.componentsHint',
                  'Шесть блоков скоринга FundGate, приведены к проценту от максимума блока. Основной прирост — питч-дек и описание продукта.',
                )}
              </ChartHint>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={componentPoints} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke={theme.colors.text.tertiary}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    stroke={theme.colors.text.tertiary}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme.colors.text.secondary }}
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  <Bar
                    dataKey="before"
                    name={t('platformReport.period.beforeShort', 'Апр–июн')}
                    fill={theme.colors.chart.blue}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={12}
                  />
                  <Bar
                    dataKey="after"
                    name={t('platformReport.period.afterShort', 'Июл–авг')}
                    fill={theme.colors.chart.green}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.channel', 'Тот же канал, тот же алгоритм')}</ChartTitle>
              <ChartHint>
                {t(
                  'platformReport.charts.channelHint',
                  'Контрольная проверка: только прямые заявки через формы фондов (iframe). Версия скоринга за весь период не менялась — 1.0.0, поэтому рост нельзя объяснить сменой алгоритма или канала.',
                )}
              </ChartHint>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={channelPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme.colors.text.secondary }} />
                  <Bar
                    dataKey="avg"
                    name={t('platformReport.charts.avgScore', 'Средний балл')}
                    fill={theme.colors.chart.green}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.completeness', 'Заявки стали подробнее')}</ChartTitle>
              <ChartHint>
                {t(
                  'platformReport.charts.completenessHint',
                  'Среднее число заполненных полей анкеты. Автозаполнение из питч-дека и подсказки в форме подняли полноту заявки — отсюда и рост балла.',
                )}
              </ChartHint>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={completenessPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme.colors.text.secondary }} />
                  <Bar
                    dataKey="avgFields"
                    name={t('platformReport.charts.avgFields', 'Заполнено полей')}
                    fill={theme.colors.chart.purple}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={54}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartsGrid>
        </Section>

        <Section>
          <SectionTitle>{t('platformReport.sections.monthlyTable', 'Помесячная таблица качества')}</SectionTitle>
          <SectionHint>
            {t('platformReport.sections.monthlyTableHint', 'Те же цифры в табличном виде — для протокола и сверки.')}
          </SectionHint>
          <Card>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>{t('platformReport.table.month', 'Месяц')}</th>
                    <th className="num">{t('platformReport.table.count', 'Подач')}</th>
                    <th className="num">{t('platformReport.table.avg', 'Средний балл')}</th>
                    <th className="num">{t('platformReport.table.median', 'Медиана')}</th>
                    <th className="num">{t('platformReport.table.share60', 'Доля 60+')}</th>
                    <th className="num">{t('platformReport.table.share70', 'Доля 70+')}</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityPoints.map((point) => (
                    <tr key={point.month}>
                      <td>{point.label}</td>
                      <td className="num">{point.count}</td>
                      <td className="num">{point.avg.toFixed(1)}</td>
                      <td className="num">{point.median.toFixed(1)}</td>
                      <td className="num">{point.share60.toFixed(1)}%</td>
                      <td className="num">{point.share70.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        </Section>

        <Section>
          <SectionTitle>{t('platformReport.sections.flow', 'Поток и структура заявок')}</SectionTitle>
          <ChartsGrid>
            <ChartCard>
              <ChartTitle>{t('platformReport.charts.geography', 'География заявителей')}</ChartTitle>
              <ChartHint>
                {t('platformReport.charts.geographyHint', 'Доля от подач с указанной страной.')}
              </ChartHint>
              {geography.map((item) => (
                <BarRow key={item.country}>
                  <BarLabel title={item.country}>{item.country}</BarLabel>
                  <BarTrack>
                    <BarFill $pct={(item.count / geoTotal) * 100} $tone={theme.colors.chart.blue} />
                  </BarTrack>
                  <BarValue>
                    {item.count} · {((item.count / geoTotal) * 100).toFixed(0)}%
                  </BarValue>
                </BarRow>
              ))}
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.industries', 'Отрасли стартапов')}</ChartTitle>
              <ChartHint>{t('platformReport.charts.industriesHint', 'Топ-10 отраслей по числу подач.')}</ChartHint>
              {industries.map((item) => (
                <BarRow key={item.industry}>
                  <BarLabel title={item.industry}>{item.industry}</BarLabel>
                  <BarTrack>
                    <BarFill $pct={(item.count / industryMax) * 100} $tone={theme.colors.chart.purple} />
                  </BarTrack>
                  <BarValue>{item.count}</BarValue>
                </BarRow>
              ))}
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.funnel', 'Статусы карточек в CRM фондов')}</ChartTitle>
              <ChartHint>
                {t(
                  'platformReport.charts.funnelHint',
                  'Все карточки «стартап → фонд» у шести фондов. Один стартап может быть в воронке нескольких фондов одновременно.',
                )}
              </ChartHint>
              {funnel.map((item) => (
                <BarRow key={item.status}>
                  <BarLabel>{t(`platformReport.funnel.${item.status}`, item.status)}</BarLabel>
                  <BarTrack>
                    <BarFill $pct={(item.count / funnelTotal) * 100} $tone={theme.colors.chart.amber} />
                  </BarTrack>
                  <BarValue>{item.count}</BarValue>
                </BarRow>
              ))}
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('platformReport.charts.tooling', 'Инструменты платформы в работе')}</ChartTitle>
              <ChartHint>
                {t('platformReport.charts.toolingHint', 'Сколько раз использованы ключевые функции. Счётчики платформенные — по всем фондам, не только по шести.')}
              </ChartHint>
              <TableWrap>
                <Table>
                  <tbody>
                    <tr>
                      <td>{t('platformReport.tooling.pitchDecks', 'Питч-деков загружено для автозаполнения')}</td>
                      <td className="num">{tooling.pitchDecks}</td>
                    </tr>
                    <tr>
                      <td>{t('platformReport.tooling.autofillJobs', 'Разборов питч-дека AI-автозаполнением')}</td>
                      <td className="num">{tooling.autofillJobs}</td>
                    </tr>
                    <tr>
                      <td>{t('platformReport.tooling.smartval', 'Оценок стоимости через SmartVal')}</td>
                      <td className="num">{tooling.smartvalEvaluations}</td>
                    </tr>
                    <tr>
                      <td>{t('platformReport.tooling.investorApplications', 'Заявок от инвесторов')}</td>
                      <td className="num">{tooling.investorApplications}</td>
                    </tr>
                    <tr>
                      <td>{t('platformReport.tooling.aiChats', 'Диалогов с AI-ассистентом фонда')}</td>
                      <td className="num">{tooling.aiChats}</td>
                    </tr>
                    <tr>
                      <td>{t('platformReport.tooling.evaluations', 'Автоматических оценок заявок выполнено')}</td>
                      <td className="num">{tooling.aiEvaluations}</td>
                    </tr>
                  </tbody>
                </Table>
              </TableWrap>
            </ChartCard>
          </ChartsGrid>
        </Section>

        <Section>
          <SectionTitle>{t('platformReport.sections.funds', 'Разбивка по фондам')}</SectionTitle>
          <SectionHint>
            {t(
              'platformReport.sections.fundsHint',
              '«Карточек» — сколько заявок получил фонд, «уникальных» — сколько за ними стоит разных стартапов.',
            )}
          </SectionHint>
          <Card>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>{t('platformReport.table.fund', 'Фонд')}</th>
                    <th className="num">{t('platformReport.table.cards', 'Карточек')}</th>
                    <th className="num">{t('platformReport.table.unique', 'Уникальных')}</th>
                    <th className="num">{t('platformReport.table.avg', 'Средний балл')}</th>
                    <th className="num">{t('platformReport.table.portfolio', 'В портфеле')}</th>
                    <th className="num">{t('platformReport.table.rejected', 'Отклонено')}</th>
                    <th>{t('platformReport.table.connected', 'Подключён')}</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund) => (
                    <tr key={fund.id}>
                      <td>{fund.name}</td>
                      <td className="num">{fund.cards}</td>
                      <td className="num">{fund.uniqueStartups}</td>
                      <td className="num">{fund.avgScore === null ? '—' : fund.avgScore.toFixed(1)}</td>
                      <td className="num">{fund.portfolio || '—'}</td>
                      <td className="num">{fund.rejected || '—'}</td>
                      <td>{fund.connectedAt ? new Date(fund.connectedAt).toLocaleDateString(locale) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        </Section>

        <Section>
          <SectionTitle>{t('platformReport.sections.method', 'Как считали')}</SectionTitle>
          <NoteCard>
            <NoteList>
              <li>
                <strong>{t('platformReport.method.sourceLabel', 'Источник')}:</strong> {reportData.dataSource}.{' '}
                {t('platformReport.method.source', 'Отобраны карточки шести фондов-партнёров, перечисленных на fundgate.uz. Тестовых и QA-записей среди них нет.')}
              </li>
              <li>
                <strong>{t('platformReport.method.dedupLabel', 'Дедупликация')}:</strong>{' '}
                {t(
                  'platformReport.method.dedup',
                  'Стартапы склеиваются тем же алгоритмом, что и публичный счётчик на fundgate.uz: по общему идентификатору заявки и по связке «название + телефон + сайт». Расчёт сверен с боевым эндпоинтом — по всей платформе он даёт те же 540 уникальных стартапов, по шести фондам 416. Метрики качества дополнительно разведены по дате подачи, чтобы копии одной заявки не считались дважды.',
                )}
              </li>
              <li>
                <strong>{t('platformReport.method.scoreLabel', 'Балл')}:</strong>{' '}
                {t(
                  'platformReport.method.score',
                  'Итоговая оценка FundGate по 100-балльной шкале: полнота заявки 20, питч-дек 20, тракшн 20, команда 15, продукт 15, материалы 10. В расчёт идут только заявки с успешно завершённым анализом и ненулевым баллом.',
                )}
              </li>
              <li>
                <strong>{t('platformReport.method.speedLabel', 'Скорость')}:</strong>{' '}
                {t('platformReport.method.speed', 'Медиана времени от подачи заявки до готовой AI-оценки')}:{' '}
                {speed.medianSec ? `${Math.round(speed.medianSec)} ${t('platformReport.units.sec', 'сек')}` : '—'},{' '}
                {t('platformReport.method.p90', '90-й перцентиль')}:{' '}
                {speed.p90Sec ? `${Math.round(speed.p90Sec)} ${t('platformReport.units.sec', 'сек')}` : '—'} (
                {speed.count} {t('platformReport.units.submissions', 'подач')}).
              </li>
              <li>
                <strong>{t('platformReport.method.refreshLabel', 'Обновление')}:</strong>{' '}
                {t('platformReport.method.refresh', 'Срез пересобирается командой')}{' '}
                <code>python3 tooling/platform-report/generate_platform_report.py</code>.
              </li>
            </NoteList>
          </NoteCard>
        </Section>
      </PrintArea>
    </PageContainer>
  );
}
