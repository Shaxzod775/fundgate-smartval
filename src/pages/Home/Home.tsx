import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Card } from '../../components/ui/Card';
import { useLocalizedArticles } from '../../utils/contentData';
import { newsApi, News } from '../../services/api';
import { formatLongDate } from '../../utils/formatDate';
import { PageTransition } from '../../styles/animations';
import { List, Grid as GridIcon, ExternalLink, Loader2, Search } from 'lucide-react';

const PageContainer = styled.div`
  width: 100%;
  padding-top: ${({ theme }) => theme.spacing[6]};
  ${PageTransition}
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SectionSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const ViewToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ViewButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primaryLight : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.muted};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryLight};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ArticlesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[5]};
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[4]};
  }
`;

const ArticleCard = styled.div<{ $bgImage: string }>`
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  min-height: 200px;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'light' ? theme.colors.border.primary : 'rgba(16, 185, 129, 0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'light'
      ? `linear-gradient(135deg, ${theme.colors.bg.card} 0%, ${theme.colors.bg.cardHover} 100%)`
      : 'transparent'};
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ theme }) =>
    theme.mode === 'light' ? theme.shadows.md : '0 8px 32px rgba(0, 0, 0, 0.4)'};
  display: flex;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $bgImage }) => $bgImage};
    filter: blur(3px);
    opacity: ${({ theme }) => (theme.mode === 'light' ? 0.18 : 1)};
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) =>
      theme.mode === 'light'
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 249, 0.9) 58%, rgba(232, 248, 240, 0.86) 100%)'
        : `linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.4) 40%,
            rgba(0, 0, 0, 0.7) 100%
          )`};
    transition: opacity 0.4s ease;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: ${({ theme }) =>
      theme.mode === 'light'
        ? `0 18px 44px rgba(15, 23, 42, 0.12),
           0 0 0 1px ${theme.colors.accent.primary}`
        : `0 20px 60px rgba(16, 185, 129, 0.3),
           0 10px 30px rgba(0, 0, 0, 0.4),
           0 0 0 1px ${theme.colors.accent.primary}`};
  }

  &:hover::after {
    opacity: ${({ theme }) => (theme.mode === 'light' ? 0.98 : 0.7)};
  }

  &:hover {
    animation: subtlePulse 3s ease-in-out infinite;
  }

  @keyframes subtlePulse {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.05);
    }
  }
`;

const ArticleContent = styled.div`
  position: relative;
  z-index: 10;
  padding: ${({ theme }) => theme.spacing[8]};
  padding-top: 60px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  transform: translateX(0);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  ${ArticleCard}:hover & {
    transform: translateX(8px);
  }

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[5]};
    padding-top: 56px;
  }
`;

const ArticleTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.3;
  letter-spacing: 0;
  text-shadow: ${({ theme }) =>
    theme.mode === 'light'
      ? 'none'
      : `0 2px 12px rgba(0, 0, 0, 0.9),
         0 1px 6px rgba(0, 0, 0, 1)`};
  transition: all 0.4s ease;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;

  ${ArticleCard}:hover & {
    text-shadow: ${({ theme }) =>
      theme.mode === 'light'
        ? 'none'
        : `0 4px 16px rgba(0, 0, 0, 1),
           0 2px 8px rgba(0, 0, 0, 1),
           0 0 20px rgba(16, 185, 129, 0.4)`};
  }
`;

const ArticleDescription = styled.p`
  font-size: 14px;
  color: ${({ theme }) =>
    theme.mode === 'light' ? theme.colors.text.secondary : 'rgba(255, 255, 255, 0.85)'};
  line-height: 1.5;
  font-weight: 400;
  margin: 0;
  text-shadow: ${({ theme }) =>
    theme.mode === 'light'
      ? 'none'
      : `0 1px 6px rgba(0, 0, 0, 0.9),
         0 1px 3px rgba(0, 0, 0, 1)`};
  transition: all 0.4s ease;
  letter-spacing: 0;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;

  ${ArticleCard}:hover & {
    color: ${({ theme }) =>
      theme.mode === 'light' ? theme.colors.text.primary : 'rgba(255, 255, 255, 1)'};
  }
`;

const UnreadBadge = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing[4]};
  left: ${({ theme }) => theme.spacing[4]};
  z-index: 10;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'light' ? 'rgba(236, 253, 245, 0.92)' : 'rgba(16, 185, 129, 0.25)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'light' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.4)'};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  letter-spacing: 0;
  box-shadow: ${({ theme }) =>
    theme.mode === 'light' ? '0 4px 14px rgba(16, 185, 129, 0.12)' : '0 4px 16px rgba(16, 185, 129, 0.2)'};
  transition: all 0.3s ease;

  ${ArticleCard}:hover & {
    background: ${({ theme }) =>
      theme.mode === 'light' ? 'rgba(209, 250, 229, 0.96)' : 'rgba(16, 185, 129, 0.35)'};
    border-color: ${({ theme }) =>
      theme.mode === 'light' ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.6)'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'light' ? '0 6px 18px rgba(16, 185, 129, 0.16)' : '0 6px 20px rgba(16, 185, 129, 0.3)'};
  }
`;

const NewsGrid = styled.div<{ $view: 'grid' | 'list' }>`
  display: ${({ $view }) => ($view === 'grid' ? 'grid' : 'flex')};
  ${({ $view }) =>
    $view === 'grid'
      ? `
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

    @media (max-width: 1400px) {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `
      : `
    flex-direction: column;
    gap: 16px;
  `}
`;

const NewsCard = styled(Card)<{ $view: 'grid' | 'list' }>`
  cursor: pointer;
  display: ${({ $view }) => ($view === 'list' ? 'flex' : 'block')};
  gap: ${({ $view, theme }) => ($view === 'list' ? theme.spacing[4] : '0')};
  padding: ${({ $view, theme }) => ($view === 'list' ? theme.spacing[4] : theme.spacing[5])};

  &:hover {
    transform: translateY(-2px);
  }
`;

const NewsImage = styled.div<{ $url?: string; $view: 'grid' | 'list' }>`
  width: ${({ $view }) => ($view === 'list' ? '200px' : '100%')};
  height: ${({ $view }) => ($view === 'list' ? '120px' : '180px')};
  flex-shrink: 0;
  background: ${({ $url, theme }) =>
    $url
      ? `linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.18)), url(${$url})`
      : `linear-gradient(135deg, ${theme.colors.accent.primary}33, ${theme.colors.bg.secondary})`};
  background-size: cover;
  background-position: center;
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: ${({ $view, theme }) => ($view === 'grid' ? theme.spacing[4] : '0')};
`;

const NewsContent = styled.div`
  flex: 1;
`;

const NewsTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  line-height: 1.4;
`;

const NewsExcerpt = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const NewsSource = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const NewsDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors.text.muted};
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const SearchContainer = styled.div`
  position: relative;
  max-width: 360px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.text.muted};
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SourceLink = styled.a`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.accent.primary};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const articles = useLocalizedArticles();
  const [newsView, setNewsView] = useState<'grid' | 'list'>('grid');
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('readArticles');
    if (stored) {
      setReadArticles(new Set(JSON.parse(stored)));
    }
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setNewsLoading(true);
        setNewsError(null);
        const response = await newsApi.getAll(20);
        
        if (response.success && response.data) {
          setNews(response.data);
        } else {
          setNews([]);
          setNewsError('Failed to load news');
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setNews([]);
        setNewsError('Failed to load news from server');
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);

  const featuredArticles = articles.slice(0, 3);

  const cardBackgrounds = [
    'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
    'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
    'linear-gradient(135deg, #065f46 0%, #022c22 100%)',
  ];

  const handleArticleClick = (article: typeof featuredArticles[0]) => {
    const updated = new Set(readArticles);
    updated.add(article.id);
    setReadArticles(updated);
    localStorage.setItem('readArticles', JSON.stringify([...updated]));
    if (article.pdfUrl) {
      window.open(article.pdfUrl, '_blank');
    } else {
      navigate(`/article/${article.id}`);
    }
  };

  const formatDate = (dateInput: string | Date | { _seconds: number; _nanoseconds: number } | null | undefined) => {
    if (!dateInput) return '';

    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'object' && '_seconds' in dateInput) {
      date = new Date(dateInput._seconds * 1000);
    } else {
      return '';
    }

    if (isNaN(date.getTime())) return '';

    return formatLongDate(date, i18n.resolvedLanguage || i18n.language);
  };

  const handleNewsClick = (item: News) => {
    if (item.isExternal && (item.externalUrl || item.sourceUrl)) {
      window.open(item.externalUrl || item.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(`/news/${item.id}`);
  };

  return (
    <PageContainer>
      <Section>
        <ArticlesGrid>
          {featuredArticles.map((article, index) => {
            const isUnread = !readArticles.has(article.id);
            return (
              <ArticleCard
                key={article.id}
                $bgImage={cardBackgrounds[index]}
                onClick={() => handleArticleClick(article)}
              >
                {isUnread && <UnreadBadge>{t('home.usefulToStudy')}</UnreadBadge>}
                <ArticleContent>
                  <ArticleTitle>{article.title}</ArticleTitle>
                  <ArticleDescription>{article.description}</ArticleDescription>
                </ArticleContent>
              </ArticleCard>
            );
          })}
        </ArticlesGrid>
      </Section>

      <Section>
        <SectionHeader>
          <div>
            <SectionTitle>{t('home.newsTitle')}</SectionTitle>
            <SectionSubtitle>
              {t('home.newsSubtitle')}
            </SectionSubtitle>
          </div>
        </SectionHeader>

        {newsLoading ? (
          <LoadingContainer>
            <Loader2 size={32} />
          </LoadingContainer>
        ) : newsError && news.length === 0 ? (
          <ErrorMessage>{newsError}</ErrorMessage>
        ) : (
          <NewsGrid $view={newsView}>
            {news.map((item) => (
              <NewsCard
                key={item.id}
                $view={newsView}
                onClick={() => handleNewsClick(item)}
              >
                <NewsImage $url={item.imageUrl} $view={newsView} />
                <NewsContent>
                  <NewsTitle>{item.title}</NewsTitle>
                  <NewsExcerpt>{item.excerpt}</NewsExcerpt>
                  <NewsMeta>
                    {item.sourceUrl ? (
                      <SourceLink
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink />
                        {item.source}
                      </SourceLink>
                    ) : (
                      <NewsSource>
                        <ExternalLink />
                        {item.source}
                      </NewsSource>
                    )}
                    <NewsDate>{formatDate(item.publishedAt)}</NewsDate>
                  </NewsMeta>
                </NewsContent>
              </NewsCard>
            ))}
          </NewsGrid>
        )}
      </Section>
    </PageContainer>
  );
};

export default Home;
