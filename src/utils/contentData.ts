import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Article, News } from '../types';

export interface ArticleMeta {
  id: string;
  category: Article['category'];
  icon?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const articleMeta: ArticleMeta[] = [
  {
    id: 'article-1',
    category: 'guide',
    icon: 'guide',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-06-17'),
  },
  {
    id: 'article-founder-submit',
    category: 'guide',
    icon: 'guide',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-06-17'),
  },
  {
    id: 'article-crm-guide',
    category: 'guide',
    icon: 'guide',
    pdfUrl: '/FundGate_CRM_Guide.pdf',
    createdAt: new Date('2026-02-18'),
    updatedAt: new Date('2026-02-18'),
  },
  {
    id: 'article-2',
    category: 'faq',
    icon: 'robot',
    createdAt: new Date('2026-01-12'),
    updatedAt: new Date('2026-01-12'),
  },
  {
    id: 'article-3',
    category: 'tutorial',
    icon: 'link',
    createdAt: new Date('2026-01-14'),
    updatedAt: new Date('2026-01-14'),
  },
  {
    id: 'article-4',
    category: 'faq',
    icon: 'checklist',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
];

export const localizeArticle = (meta: ArticleMeta, t: TFunction): Article => ({
  ...meta,
  title: t(`article.items.${meta.id}.title`),
  description: t(`article.items.${meta.id}.description`),
  content: t(`article.items.${meta.id}.content`),
});

export const useLocalizedArticles = (): Article[] => {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => articleMeta.map((meta) => localizeArticle(meta, t)),
    [t, i18n.language],
  );
};

export const mockNews: News[] = [
  {
    id: 'news-1',
    title: 'IT Park Ventures запускает новый фонд на $50M для стартапов Центральной Азии',
    excerpt:
      'IT Park Ventures объявил о запуске нового венчурного фонда объёмом $50 миллионов, направленного на поддержку технологических стартапов в Узбекистане и регионе ЦА.',
    content: `IT Park Ventures, ведущая венчурная компания Узбекистана, объявила о запуске нового фонда объёмом $50 миллионов. Фонд будет фокусироваться на инвестициях в технологические стартапы на стадиях Pre-Seed, Seed и Series A.

Основные направления инвестиций:
- FinTech и платёжные решения
- EdTech и образовательные платформы
- HealthTech и телемедицина
- E-commerce и маркетплейсы
- AI/ML решения

Средний чек инвестиций составит от $100K до $2M. Фонд планирует закрыть первые сделки уже в Q1 2026.`,
    source: 'Kun.uz',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    tags: ['VC', 'IT Park', 'Инвестиции'],
    publishedAt: new Date('2026-01-18'),
  },
  {
    id: 'news-2',
    title: 'Узбекский FinTech-стартап PayMe привлёк $15M в раунде Series B',
    excerpt:
      'PayMe, один из крупнейших платёжных сервисов Узбекистана, завершил раунд Series B на $15 миллионов при оценке $100M.',
    content: `PayMe успешно закрыл раунд Series B, привлекая $15 миллионов от международных и региональных инвесторов. Раунд возглавил азиатский VC-фонд Sequoia Capital India.

Ключевые показатели PayMe:
- 5 миллионов активных пользователей
- $500M годовой TPV (Total Payment Volume)
- Рост 300% год к году
- Присутствие в 5 странах ЦА

Привлечённые средства будут направлены на развитие новых финансовых продуктов и экспансию в Казахстан и Таджикистан.`,
    source: 'Spot',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
    tags: ['FinTech', 'Series B', 'PayMe'],
    publishedAt: new Date('2026-01-17'),
  },
  {
    id: 'news-3',
    title: 'Количество Tech-стартапов в Узбекистане выросло на 45% в 2025 году',
    excerpt:
      'По данным StartupBase, в 2025 году количество зарегистрированных технологических стартапов в Узбекистане выросло на 45% по сравнению с 2024 годом.',
    content: `Согласно отчёту StartupBase, в 2025 году в Узбекистане было зарегистрировано более 2,000 новых технологических стартапов, что на 45% больше, чем в предыдущем году.

Статистика по индустриям:
- E-commerce: 28%
- FinTech: 22%
- EdTech: 18%
- HealthTech: 12%
- Другие: 20%

Общий объём инвестиций в узбекские стартапы в 2025 году составил $180 миллионов, что в 2.5 раза больше показателя 2024 года.

Эксперты связывают рост с улучшением инвестиционного климата, запуском новых акселераторов и активной государственной поддержкой IT-сектора.`,
    source: 'Daryo',
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
    tags: ['Статистика', 'Экосистема', 'Рост'],
    publishedAt: new Date('2026-01-16'),
  },
  {
    id: 'news-4',
    title: 'Новый акселератор LaunchPad открывается в Ташкенте',
    excerpt:
      'LaunchPad, международная акселераторская программа, объявила об открытии своего первого офиса в Центральной Азии.',
    content: `LaunchPad, известная акселераторская программа с офисами в 15 странах, открывает представительство в Ташкенте. Программа будет фокусироваться на стартапах на стадиях Pre-Seed и Seed.

Условия программы:
- 12-недельная интенсивная программа
- Инвестиции до $150K за 7% equity
- Менторство от успешных предпринимателей
- Доступ к глобальной сети инвесторов
- Demo Day с участием международных VC

Набор в первый батч стартует в феврале 2026. Ожидается участие 10-15 стартапов.`,
    source: 'Gazeta.uz',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    tags: ['Акселератор', 'LaunchPad', 'Ташкент'],
    publishedAt: new Date('2026-01-15'),
  },
  {
    id: 'news-5',
    title: 'Казахстанский EdTech-стартап Bilimland экспортирует решения в Узбекистан',
    excerpt:
      'Образовательная платформа Bilimland из Казахстана объявила о выходе на узбекский рынок в партнёрстве с Министерством народного образования.',
    content: `Bilimland, крупнейшая EdTech-платформа Казахстана с 2 миллионами пользователей, начинает экспансию в Узбекистан. Платформа предлагает интерактивные уроки, адаптивное обучение и систему оценки знаний для школьников.

Планы по Узбекистану:
- Локализация контента под узбекскую программу
- Запуск пилотных программ в 50 школах
- Обучение 100,000 учеников к концу 2026 года
- Партнёрство с Министерством образования

Это первый крупный кейс экспорта EdTech-решений между странами ЦА, что может стать трендом для региональной экспансии стартапов.`,
    source: 'Kun.uz',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
    tags: ['EdTech', 'Экспансия', 'Казахстан'],
    publishedAt: new Date('2026-01-14'),
  },
  {
    id: 'news-6',
    title: 'Venture Summit Central Asia 2026 пройдёт в Алматы',
    excerpt:
      'Крупнейшая венчурная конференция региона соберёт более 500 участников из 20 стран в апреле 2026.',
    content: `Venture Summit Central Asia, ведущая конференция для стартапов и инвесторов региона, пройдёт 15-16 апреля 2026 года в Алматы, Казахстан.

Программа включает:
- Pitch-сессии для 50 отобранных стартапов
- Панельные дискуссии с топ-инвесторами
- Нетворкинг с VC, angels, корпорациями
- Мастер-классы по fundraising
- Showcase новых технологий

Ожидается участие представителей Sequoia, a16z, Tiger Global, DST Global и других топ-фондов. Регистрация открыта на официальном сайте.`,
    source: 'Forbes Kazakhstan',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    tags: ['Конференция', 'Нетворкинг', 'Алматы'],
    publishedAt: new Date('2026-01-13'),
  },
];
