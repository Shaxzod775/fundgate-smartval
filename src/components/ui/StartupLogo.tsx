import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';
import { normalizeCrmFileUrl, resolveCrmFileUrl } from '../../services/api';
import { needsCrmFileResolution } from '../../utils/crmFileUrl';

type Variant = 'sm' | 'md' | 'lg' | 'hero';
type Shape = 'rounded' | 'circle';

export interface StartupLogoProps {
  src?: string | null;
  startupId?: string | null;
  name: string;
  variant?: Variant;
  shape?: Shape;
  className?: string;
}

interface StyledWrapperProps {
  $variant: Variant;
  $shape: Shape;
}

const getSizeStyles = (variant: Variant) => {
  switch (variant) {
    case 'sm':
      return css`
        width: 32px;
        height: 32px;
        flex-shrink: 0;
      `;
    case 'lg':
      return css`
        width: 80px;
        height: 80px;
        flex-shrink: 0;
      `;
    case 'hero':
      return css`
        width: 100%;
        height: 100%;
      `;
    case 'md':
    default:
      return css`
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      `;
  }
};

const getFallbackFontSize = (variant: Variant) => {
  switch (variant) {
    case 'sm':
      return '16px';
    case 'lg':
      return '28px';
    case 'hero':
      return '40%';
    case 'md':
    default:
      return '24px';
  }
};

const getRadius = (shape: Shape, theme: Theme) =>
  shape === 'circle' ? '50%' : theme.radius.lg;

const Wrapper = styled.div<StyledWrapperProps>`
  ${({ $variant }) => getSizeStyles($variant)}
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ $shape, theme }) => getRadius($shape, theme)};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoImage = styled.img<{ $variant: Variant }>`
  max-width: ${({ $variant }) => ($variant === 'hero' ? '65%' : '100%')};
  max-height: ${({ $variant }) => ($variant === 'hero' ? '65%' : '100%')};
  width: ${({ $variant }) => ($variant === 'hero' ? 'auto' : '100%')};
  height: ${({ $variant }) => ($variant === 'hero' ? 'auto' : '100%')};
  object-fit: contain;
  display: block;
`;

const Fallback = styled.span<{ $variant: Variant }>`
  font-size: ${({ $variant }) => getFallbackFontSize($variant)};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  text-transform: uppercase;
  line-height: 1;
  user-select: none;
`;

const isValidImageUrl = (src?: string | null): src is string => {
  if (!src) return false;
  return src.startsWith('/') || src.startsWith('http') || src.startsWith('data:');
};

const directLogoSrc = (src?: string | null, startupId?: string | null): string | null => {
  const normalized = normalizeCrmFileUrl(src, startupId);
  if (!isValidImageUrl(normalized) || needsCrmFileResolution(normalized)) return null;
  return normalized;
};

export const StartupLogo = ({
  src,
  startupId,
  name,
  variant = 'md',
  shape = 'rounded',
  className,
}: StartupLogoProps) => {
  const [imgError, setImgError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(
    () => directLogoSrc(src, startupId),
  );

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setImgError(false);

    const direct = directLogoSrc(src, startupId);
    if (direct) {
      setResolvedSrc(direct);
      return () => { active = false; };
    }
    setResolvedSrc(null);

    const normalized = normalizeCrmFileUrl(src, startupId);
    if (!isValidImageUrl(normalized)) return () => { active = false; };

    resolveCrmFileUrl(normalized).then((url) => {
      if (!active) {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url?.startsWith('blob:') ? url : null;
      setResolvedSrc(url);
      if (!url) setImgError(true);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, startupId]);

  const showImage = Boolean(resolvedSrc) && !imgError;
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <Wrapper $variant={variant} $shape={shape} className={className}>
      {showImage ? (
        <LogoImage
          $variant={variant}
          src={resolvedSrc as string}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <Fallback $variant={variant}>{initial}</Fallback>
      )}
    </Wrapper>
  );
};

export default StartupLogo;
