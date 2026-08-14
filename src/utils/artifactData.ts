import { ArtifactData } from '../components/ai/AIArtifact';

export const generateReportArtifact = (): ArtifactData => ({
  type: 'report',
  title: 'Еженедельный отчет',
  data: {
    metrics: [
      {
        label: 'Всего стартапов',
        value: '24',
        change: '+3 за неделю',
      },
      {
        label: 'Активных проектов',
        value: '18',
        change: '+2 за неделю',
      },
      {
        label: 'На проверке',
        value: '6',
        change: '+1 за неделю',
      },
      {
        label: 'Средний AI Score',
        value: '87',
        change: '+5 за неделю',
      },
    ],
    summary:
      'За последнюю неделю портфель показал значительный рост. Три новых стартапа прошли первичную проверку и добавлены в портфель. Средний AI Score вырос на 5 пунктов благодаря улучшенным показателям существующих проектов.',
  },
});

export const generatePortfolioAnalysisArtifact = (): ArtifactData => ({
  type: 'portfolio-analysis',
  title: 'Анализ портфеля: Топ стартапы',
  data: {
    startups: [
      {
        name: 'PayMe',
        category: 'FinTech',
        score: 98,
        valuation: '$12M',
      },
      {
        name: 'MediScan AI',
        category: 'HealthTech',
        score: 95,
        valuation: '$8.5M',
      },
      {
        name: 'Porte Tech',
        category: 'E-commerce',
        score: 92,
        valuation: '$6.2M',
      },
      {
        name: 'EduStream',
        category: 'EdTech',
        score: 89,
        valuation: '$5.8M',
      },
      {
        name: 'AgriConnect',
        category: 'AgriTech',
        score: 85,
        valuation: '$4.5M',
      },
    ],
  },
});

export const generateStartupAnalysisArtifact = (startupName?: string): ArtifactData => ({
  type: 'startup-analysis',
  title: `Анализ стартапа: ${startupName || 'PayMe'}`,
  data: {
    name: startupName || 'PayMe',
    category: 'FinTech',
    score: 98,
    valuation: '$12M',
    strengths: [
      'Сильная команда с опытом в финтех-индустрии',
      'Высокий рост пользовательской базы (300% год к году)',
      'Отличные unit economics (LTV/CAC = 5.2)',
      'Защищенная технология с патентами',
      'Партнерства с крупными банками',
    ],
    recommendations: [
      'Рекомендуем увеличить инвестиции в маркетинг для ускорения роста',
      'Рассмотреть возможность экспансии в соседние рынки ЦА',
      'Укрепить команду разработки для масштабирования продукта',
      'Подготовить стратегию выхода на Series B раунд',
    ],
  },
});

export const generateTasksArtifact = (): ArtifactData => ({
  type: 'tasks',
  title: 'Задачи по проектам',
  data: {
    tasks: [
      {
        title: 'Провести due diligence для PayMe',
        project: 'PayMe',
        deadline: 'До 25 января',
        completed: true,
      },
      {
        title: 'Запланировать встречу с командой MediScan AI',
        project: 'MediScan AI',
        deadline: 'До 22 января',
        completed: false,
      },
      {
        title: 'Проверить финансовые показатели Porte Tech',
        project: 'Porte Tech',
        deadline: 'До 23 января',
        completed: false,
      },
      {
        title: 'Подготовить презентацию для инвесторов EduStream',
        project: 'EduStream',
        deadline: 'До 26 января',
        completed: false,
      },
      {
        title: 'Обновить оценку стартапа AgriConnect',
        project: 'AgriConnect',
        deadline: 'До 24 января',
        completed: false,
      },
      {
        title: 'Провести анализ конкурентов для всех FinTech стартапов',
        project: 'Портфель',
        deadline: 'До 28 января',
        completed: false,
      },
    ],
  },
});

export const getArtifactFromPrompt = (prompt: string): ArtifactData | null => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('отчет') || lowerPrompt.includes('report')) {
    return generateReportArtifact();
  }

  if (
    lowerPrompt.includes('портфель') ||
    lowerPrompt.includes('portfolio') ||
    lowerPrompt.includes('топ') ||
    lowerPrompt.includes('лучш')
  ) {
    return generatePortfolioAnalysisArtifact();
  }

  if (
    lowerPrompt.includes('задач') ||
    lowerPrompt.includes('task') ||
    lowerPrompt.includes('todo')
  ) {
    return generateTasksArtifact();
  }

  if (
    lowerPrompt.includes('анализ') &&
    (lowerPrompt.includes('стартап') || lowerPrompt.includes('startup'))
  ) {
    return generateStartupAnalysisArtifact();
  }

  return null;
};
