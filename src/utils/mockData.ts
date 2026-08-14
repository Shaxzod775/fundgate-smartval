import {
  Startup,
  Manager,
  Organization,
  StartupStatus,
  StartupStage,
  StartupSource,
} from '../types';

import managerAvatar from '../assets/manager_narzullaev.png';

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'IT Park Ventures',
  logo: '/logos/logo_it_park_ventures.jpeg',
  createdAt: new Date('2024-01-01'),
};

export const mockManagers: Manager[] = [
  {
    id: 'mgr-1',
    name: 'Шахзод Нарзуллаев',
    email: 'shahzod@fundgate.com',
    avatar: managerAvatar,
    role: 'admin',
    organizationId: 'org-1',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'mgr-2',
    name: 'Дилшод Алимов',
    email: 'dilshod@fundgate.com',
    avatar: 'https://i.pravatar.cc/150?img=13',
    role: 'manager',
    organizationId: 'org-1',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'mgr-3',
    name: 'Фаррух Юсупов',
    email: 'farrukh@fundgate.com',
    avatar: 'https://i.pravatar.cc/150?img=14',
    role: 'manager',
    organizationId: 'org-1',
    createdAt: new Date('2024-02-01'),
  },
];

export const mockStartups: Startup[] = [
  {
    id: 'startup-real-1',
    logo: '/logos/startups/aither_logo.jpg',
    brief: {
      companyName: 'Aither',
      website: 'https://innovatechagency.net',
      industry: 'Proptech',
      description: 'Aither — AI-платформа, которая переосмысливает аренду и городские путешествия. Мы объединяем проверенную локальную базу жилья, развлечений и сервисов с умным чат-консьержем.',
      stage: 'Pre-Seed',
      foundedYear: 2025,
      teamSize: 12,
      fundingRequest: 136000,
      useOfFunds: 'Product development, marketing',
    },
    status: 'new',
    source: 'FundGate',
    aiAnalysis: {
      score: 88,
      valuation: 2500000,
      strengths: ['Innovative AI usage', 'Verified listings', 'Strong local focus'],
      weaknesses: ['High competition in proptech', 'Complex operations'],
      marketAnalysis: 'Growing demand for smart rental solutions in urban areas.',
      teamAnalysis: 'Team seems experienced in local market dynamics.',
      productAnalysis: 'AI concierge is a strong differentiator.',
      financialAnalysis: 'Targeting MVP revenue key for next round.',
      recommendation: 'buy',
      generatedAt: new Date('2026-01-18'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-18'),
  },
  {
    id: 'startup-real-2',
    logo: '/logos/startups/porte_logo.jpg',
    brief: {
      companyName: 'Porte Tech',
      website: 'https://porte.tech/',
      industry: 'PropTech',
      description: 'Цифровая платформа для автоматизации гостиничного сервиса. Позволяет гостям проходить онлайн-чекин и открывать двери телефоном.',
      stage: 'Seed',
      foundedYear: 2024,
      teamSize: 7,
      fundingRequest: 500000,
      previousFunding: 500000,
      useOfFunds: 'Scaling to new markets',
    },
    status: 'in_review',
    source: 'Fund',
    assignedManagerId: 'mgr-1',
    assignedManager: mockManagers[0],
    aiAnalysis: {
      score: 92,
      valuation: 5000000,
      strengths: ['Proven traction', 'Hardware integration', 'Cost saving for hotels'],
      weaknesses: ['Hardware dependency', 'Sales cycle length'],
      marketAnalysis: 'Hospitality tech is booming post-pandemic.',
      teamAnalysis: 'Strong technical execution.',
      productAnalysis: 'Seamless guest experience.',
      financialAnalysis: 'Solid raise history indicates investor confidence.',
      recommendation: 'strong_buy',
      generatedAt: new Date('2026-01-17'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-17'),
    updatedAt: new Date('2026-01-17'),
  },
  {
    id: 'startup-real-4',
    logo: '/logos/startups/oreotech_logo.jpg',
    brief: {
      companyName: 'Oreo Tech',
      website: 'https://www.pngegg.com/en/png-fwuut/download',
      industry: 'EdTech',
      description: 'Платформа для управления учебными центрами. Отслеживает посещаемость, оценки, платежи студентов.',
      stage: 'Pre-Seed',
      foundedYear: 2024,
      teamSize: 6,
      fundingRequest: 300000,
      previousFunding: 20000,
      useOfFunds: 'Marketing, platform features',
    },
    status: 'portfolio',
    source: 'FundGate',
    assignedManagerId: 'mgr-3',
    assignedManager: mockManagers[2],
    aiAnalysis: {
      score: 80,
      valuation: 5000000,
      strengths: ['Large user base (915)', 'Comprehensive solution', 'Recurring revenue potential'],
      weaknesses: ['Crowded edtech market', 'Low barriers to entry'],
      marketAnalysis: 'Education digitalization is ongoing.',
      teamAnalysis: 'Execution focused.',
      productAnalysis: 'Solves real pain points for centers.',
      financialAnalysis: 'Projected valuation looks optimistic.',
      recommendation: 'buy',
      generatedAt: new Date('2026-01-15'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'startup-real-8',
    logo: '/logos/startups/mediscan_logo.jpg',
    brief: {
      companyName: 'MediScan AI',
      website: 'https://mediscanai.com',
      industry: 'HealthTech',
      description: 'Ранняя диагностика онкологии по медицинским снимкам с помощью ИИ. Точность 94.7%.',
      stage: 'Seed',
      foundedYear: 2023,
      teamSize: 8,
      fundingRequest: 3000000,
      previousFunding: 2500000,
      useOfFunds: 'FDA approval, clinical trials',
    },
    status: 'in_review',
    source: 'Fund',
    assignedManagerId: 'mgr-2',
    assignedManager: mockManagers[1],
    aiAnalysis: {
      score: 95,
      valuation: 12000000,
      strengths: ['High accuracy', 'Life saving potential', 'Strong previous round'],
      weaknesses: ['Regulatory approvals', 'Data privacy'],
      marketAnalysis: 'AI in healthcare is the future.',
      teamAnalysis: 'Strong.',
      productAnalysis: 'Deep tech.',
      financialAnalysis: 'Well funded.',
      recommendation: 'strong_buy',
      generatedAt: new Date('2026-01-18'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-18'),
  },
  {
    id: 'startup-real-9',
    logo: '/logos/startups/agrismart_logo.jpg',
    brief: {
      companyName: 'AgriSmart',
      website: 'https://logitech-pro.kz',
      industry: 'AgriTech',
      description: 'IoT-решения для умного сельского хозяйства и аналитики полива. Повышение урожайности на 30%.',
      stage: 'Pre-Seed',
      foundedYear: 2024,
      teamSize: 6,
      revenue: 57600,
      fundingRequest: 400000,
      useOfFunds: 'Hardware manufacturing',
    },
    status: 'pipeline',
    source: 'FundGate',
    assignedManagerId: 'mgr-3',
    assignedManager: mockManagers[2],
    aiAnalysis: {
      score: 78,
      valuation: 2000000,
      strengths: ['Real impact', 'Revenue generating'],
      weaknesses: ['Hardware distribution', 'Scalability'],
      marketAnalysis: 'Critical for regional agriculture.',
      teamAnalysis: 'Hands on.',
      productAnalysis: 'Proven results.',
      financialAnalysis: 'Breakeven potential.',
      recommendation: 'buy',
      generatedAt: new Date('2026-01-17'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-17'),
    updatedAt: new Date('2026-01-17'),
  },
  {
    id: 'startup-real-10',
    logo: '/logos/startups/payme_logo.jpg',
    brief: {
      companyName: 'PayMe Fintech',
      website: 'https://payme.uz',
      industry: 'FinTech',
      description: 'Ведущая платежная система Узбекистана. 8 млн пользователей, 50 млн транзакций.',
      stage: 'Series A',
      foundedYear: 2018,
      teamSize: 250,
      fundingRequest: 0,
      previousFunding: 30500000,
      useOfFunds: 'Expansion',
    },
    status: 'portfolio',
    source: 'Fund',
    assignedManagerId: 'mgr-1',
    assignedManager: mockManagers[0],
    aiAnalysis: {
      score: 98,
      valuation: 100000000,
      strengths: ['Market leader', 'Huge scale', 'Profitable'],
      weaknesses: ['Market saturation'],
      marketAnalysis: 'Dominant player.',
      teamAnalysis: 'Corporate structure.',
      productAnalysis: 'Standard but reliable.',
      financialAnalysis: 'IPO ready.',
      recommendation: 'hold',
      generatedAt: new Date('2026-01-15'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'startup-real-12',
    logo: '/logos/startups/quickcapital_logo.jpg',
    brief: {
      companyName: 'QuickCapital',
      website: 'https://FinTech.com',
      industry: 'FinTech',
      description: 'Цифровая платформа микрокредитования для малого бизнеса в Европе. Займы до £250K.',
      stage: 'Series A',
      foundedYear: 2023,
      teamSize: 23,
      revenue: 1680000,
      fundingRequest: 5000000,
      useOfFunds: 'Lending capital',
    },
    status: 'new',
    source: 'FundGate',
    aiAnalysis: {
      score: 85,
      valuation: 15000000,
      strengths: ['Strong MRR', 'Scoring algo'],
      weaknesses: ['Regulatory risk in UK', 'Capital intensive'],
      marketAnalysis: 'Lending is high demand.',
      teamAnalysis: 'Fintech veterans.',
      productAnalysis: 'Fast approvals.',
      financialAnalysis: 'Positive unit economics.',
      recommendation: 'buy',
      generatedAt: new Date('2026-01-19'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-19'),
    updatedAt: new Date('2026-01-19'),
  },
  {
    id: 'startup-real-15',
    logo: '/logos/startups/bilim_logo.jpg',
    brief: {
      companyName: 'Bilim karvoni',
      website: 'https://docs.google.com/presentation',
      industry: 'EdTech / Social',
      description: 'Мобильная платформа социального обучения. Учебные автобусы в селах.',
      stage: 'Pre-Seed',
      foundedYear: 2025,
      teamSize: 10,
      fundingRequest: 200000,
      useOfFunds: 'Bus maintenance, teachers',
    },
    status: 'new',
    source: 'FundGate',
    aiAnalysis: {
      score: 80,
      valuation: 500000,
      strengths: ['Strong mission', 'Community support'],
      weaknesses: ['Non-profit model?', 'Scalability costs'],
      marketAnalysis: 'Education gap is huge.',
      teamAnalysis: 'Passion driven.',
      productAnalysis: 'Offline-first approach.',
      financialAnalysis: 'Sponsorship based.',
      recommendation: 'buy',
      generatedAt: new Date('2026-01-19'),
    },
    comments: [],
    activityLog: [],
    createdAt: new Date('2026-01-19'),
    updatedAt: new Date('2026-01-19'),
  },
];

export const statusLabels: Record<StartupStatus, string> = {
  new: 'Новые заявки',
  in_review: 'На проверке',
  pipeline: 'Пайплайн',
  portfolio: 'Портфель',
  rejected: 'Отклонено',
};

export const stageLabels: Record<StartupStage, string> = {
  'Pre-Seed': 'Pre-Seed',
  Seed: 'Seed',
  'Series A': 'Series A',
  'Series B': 'Series B',
  'Series C': 'Series C',
};

export const sourceLabels: Record<StartupSource, string> = {
  FundGate: 'FundGate',
  StartupBase: 'StartupBase',
  Fund: 'Ваш фонд',
};

import { ManagerPerformance } from '../types';

const generateLast7DaysActivity = () => {
  const activity = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    activity.push({
      date,
      actions: Math.floor(Math.random() * 15) + 5, // 5-20 actions per day
    });
  }
  return activity;
};

const calculateManagerMetrics = (manager: typeof mockManagers[0]): ManagerPerformance => {
  const managerStartups = mockStartups.filter(
    (s) => s.assignedManagerId === manager.id
  );

  const portfolioStartups = managerStartups.filter((s) => s.status === 'portfolio').length;
  const pipelineStartups = managerStartups.filter((s) => s.status === 'pipeline').length;
  const reviewStartups = managerStartups.filter((s) => s.status === 'in_review').length;
  const newStartups = managerStartups.filter((s) => s.status === 'new').length;
  const rejectedStartups = managerStartups.filter((s) => s.status === 'rejected').length;

  const totalPortfolioValue = managerStartups
    .filter((s) => s.status === 'portfolio' && s.aiAnalysis)
    .reduce((sum, s) => sum + (s.aiAnalysis?.valuation || 0), 0);

  const scoresArray = managerStartups
    .filter((s) => s.aiAnalysis)
    .map((s) => s.aiAnalysis!.score);
  const averageAIScore = scoresArray.length > 0
    ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
    : 0;

  const conversionRate = managerStartups.length > 0
    ? (portfolioStartups / managerStartups.length) * 100
    : 0;

  const monthlyDealGoal = 5;
  const completedDeals = portfolioStartups;
  const dealGoalProgress = (completedDeals / monthlyDealGoal) * 100;

  const portfolioValueGoal = 10000000;
  const portfolioValueProgress = (totalPortfolioValue / portfolioValueGoal) * 100;

  const targetAIScore = 80;
  const currentAIScore = averageAIScore;

  const performanceScore = Math.min(
    100,
    (dealGoalProgress * 0.4 +
     portfolioValueProgress * 0.3 +
     (currentAIScore / targetAIScore) * 100 * 0.3)
  );

  return {
    managerId: manager.id,
    manager,
    totalStartups: managerStartups.length,
    portfolioStartups,
    pipelineStartups,
    reviewStartups,
    newStartups,
    rejectedStartups,
    totalPortfolioValue,
    averageAIScore,
    conversionRate,
    successRate: conversionRate, // Simplified
    monthlyDealGoal,
    completedDeals,
    dealGoalProgress: Math.min(100, dealGoalProgress),
    portfolioValueGoal,
    portfolioValueProgress: Math.min(100, portfolioValueProgress),
    targetAIScore,
    currentAIScore,
    last7DaysActivity: generateLast7DaysActivity(),
    teamRank: 0, // Will be calculated below
    totalManagers: mockManagers.length,
    performanceScore,
  };
};

export const mockManagerPerformance: ManagerPerformance[] = mockManagers.map(calculateManagerMetrics);

mockManagerPerformance
  .sort((a, b) => b.performanceScore - a.performanceScore)
  .forEach((mp, index) => {
    mp.teamRank = index + 1;
  });

export const getCurrentManagerPerformance = (): ManagerPerformance => {
  return mockManagerPerformance[0]; // Шахзод Нарзуллаев
};
