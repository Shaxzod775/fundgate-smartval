import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useLocalizedArticles } from '../../utils/contentData';
import { sanitizeHtml } from '../../utils/sanitize';
import { formatLongDate } from '../../utils/formatDate';
import { newsApi, News } from '../../services/api';
import { getArticleIcon } from '../../components/ui/ArticleIcons';
import { ArrowLeft, Calendar, Tag, ExternalLink, Loader2 } from 'lucide-react';
import { PageTransition } from '../../styles/animations';

const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
  ${PageTransition}
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const BackButton = styled(Button)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ArticleHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const ArticleIconWrapper = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.accent.primary};

  svg {
    width: 64px;
    height: 64px;
  }
`;

const ArticleTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  line-height: 1.3;
`;

const ArticleDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  line-height: 1.5;
`;

const ArticleMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const NewsImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const NewsTags = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const ArticleContent = styled.div`
  max-width: 800px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  font-size: ${({ theme }) => theme.fontSizes.base};

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    margin-top: ${({ theme }) => theme.spacing[4]};
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    font-weight: 600;
  }

  h1 {
    font-size: ${({ theme }) => theme.fontSizes['2xl']};
    border-bottom: 2px solid ${({ theme }) => theme.colors.border.primary};
    padding-bottom: ${({ theme }) => theme.spacing[2]};
    margin-top: ${({ theme }) => theme.spacing[5]};
  }

  h2 { font-size: ${({ theme }) => theme.fontSizes.xl}; }
  h3 { font-size: ${({ theme }) => theme.fontSizes.lg}; }

  p { margin-bottom: ${({ theme }) => theme.spacing[2]}; }

  ul, ol {
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    padding-left: ${({ theme }) => theme.spacing[5]};
  }

  li {
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    line-height: 1.6;
  }

  li svg {
    display: inline;
    vertical-align: text-top;
    margin-right: 4px;
  }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }

  br {
    display: block;
    content: "";
    margin-top: ${({ theme }) => theme.spacing[2]};
  }

  .icon-inline {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    margin-right: 6px;
    color: #10b981;
  }
`;

const NotFound = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: ${({ theme }) => theme.colors.accent.primary};

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const iconSvgs: Record<string, string> = {
  team: '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  product: '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  market: '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  finance: '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  traction: '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
};

const Article = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const articles = useLocalizedArticles();

  const isNewsRoute = location.pathname.startsWith('/news/');
  const language = i18n.resolvedLanguage || i18n.language;

  const [newsItem, setNewsItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(isNewsRoute);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNewsRoute && id) {
      const fetchNews = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await newsApi.getById(id);

          if (response.success && response.data) {
            setNewsItem(response.data);
          } else {
            setError(t('article.news.notFound', 'News item not found'));
          }
        } catch (err) {
          console.error('Error fetching news:', err);
          setError(t('article.news.loadError', 'Failed to load the news item'));
        } finally {
          setLoading(false);
        }
      };

      fetchNews();
    }
  }, [id, isNewsRoute]);

  const article = !isNewsRoute ? articles.find((a) => a.id === id) : null;

  if (loading) {
    return (
      <PageContainer>
        <BackButton variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} />
          {t('article.backToHome', 'Back to home')}
        </BackButton>
        <LoadingContainer>
          <Loader2 size={32} />
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (isNewsRoute) {
    if (error || !newsItem) {
      return (
        <PageContainer>
          <BackButton variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft size={16} />
            {t('article.backToHome', 'Back to home')}
          </BackButton>
          <NotFound>
            <h2>{t('article.news.notFound', 'News item not found')}</h2>
            <p>{error || t('article.news.notFoundDescription', 'The requested news item does not exist or has been deleted.')}</p>
          </NotFound>
        </PageContainer>
      );
    }

    const formatDate = (dateInput: string | Date | { _seconds: number; _nanoseconds: number }) => {
      let date: Date;
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else if (dateInput && typeof dateInput === 'object' && '_seconds' in dateInput) {
        date = new Date(dateInput._seconds * 1000);
      } else {
        return t('article.unknownDate', 'Unknown date');
      }
      return formatLongDate(date, language);
    };

    return (
      <PageContainer>
        <BackButton variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} />
          {t('article.backToHome', 'Back to home')}
        </BackButton>

        <ArticleHeader>
          <ArticleTitle>{newsItem.title}</ArticleTitle>
          <ArticleDescription>{newsItem.excerpt}</ArticleDescription>
          <ArticleMeta>
            <MetaItem>
              <ExternalLink />
              {newsItem.source}
            </MetaItem>
            <MetaItem>
              <Calendar />
              {formatDate(newsItem.publishedAt)}
            </MetaItem>
          </ArticleMeta>
          {newsItem.tags && newsItem.tags.length > 0 && (
            <NewsTags>
              {newsItem.tags.map((tag, idx) => (
                <Badge key={idx} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </NewsTags>
          )}
        </ArticleHeader>

        {newsItem.imageUrl && (
          <NewsImage src={newsItem.imageUrl} alt={newsItem.title} />
        )}

        <ArticleContent
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(processContent(newsItem.content)),
          }}
        />
      </PageContainer>
    );
  }

  if (!article) {
    return (
      <PageContainer>
        <BackButton variant="ghost" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} />
          {t('article.backToHome', 'Back to home')}
        </BackButton>
        <NotFound>
          <h2>{t('article.notFound', 'Article not found')}</h2>
          <p>{t('article.notFoundDescription', 'The requested article does not exist or has been deleted.')}</p>
        </NotFound>
      </PageContainer>
    );
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'faq':
      case 'guide':
      case 'tutorial':
        return t(`article.categories.${category}`, category);
      default: return category;
    }
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'faq': return 'info';
      case 'guide': return 'success';
      case 'tutorial': return 'purple';
      default: return 'neutral';
    }
  };

  return (
    <PageContainer>
      <BackButton variant="ghost" onClick={() => navigate('/home')}>
        <ArrowLeft size={16} />
        {t('article.backToHome', 'Back to home')}
      </BackButton>

      <ArticleHeader>
        {article.icon && (
          <ArticleIconWrapper>
            {getArticleIcon(article.icon, 64)}
          </ArticleIconWrapper>
        )}
        <ArticleTitle>{article.title}</ArticleTitle>
        <ArticleDescription>{article.description}</ArticleDescription>
        <ArticleMeta>
          <Badge variant={getCategoryVariant(article.category) as 'info' | 'success' | 'purple' | 'neutral'}>
            <Tag size={12} style={{ marginRight: '4px' }} />
            {getCategoryLabel(article.category)}
          </Badge>
          <MetaItem>
            <Calendar />
            {formatLongDate(new Date(article.createdAt), language)}
          </MetaItem>
        </ArticleMeta>
      </ArticleHeader>

      <ArticleContent
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(processContent(article.content)),
        }}
      />
    </PageContainer>
  );
};

function processContent(content: string) {
  const processed = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[team\]/g, iconSvgs.team)
    .replace(/\[product\]/g, iconSvgs.product)
    .replace(/\[market\]/g, iconSvgs.market)
    .replace(/\[finance\]/g, iconSvgs.finance)
    .replace(/\[traction\]/g, iconSvgs.traction);

  return processed
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
      if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
      if (line.trim() === '') return '';
      return `<p>${line}</p>`;
    })
    .filter(line => line !== '')
    .join('');
}

export default Article;
