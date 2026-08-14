import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { normalizeCrmFileUrl, resolveCrmFileUrl } from '../../services/api';
import { needsCrmFileResolution } from '../../utils/crmFileUrl';

function directImageSrc(src?: string | null, startupId?: string | null): string | null {
  const normalized = normalizeCrmFileUrl(src, startupId);
  return normalized && !needsCrmFileResolution(normalized) ? normalized : null;
}

export function useCrmImageSrc(
  src?: string | null,
  startupId?: string | null,
): { src: string | null; failed: boolean } {
  const [resolved, setResolved] = useState<string | null>(() => directImageSrc(src, startupId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);

    const direct = directImageSrc(src, startupId);
    if (direct) {
      setResolved(direct);
      return () => { active = false; };
    }
    setResolved(null);

    const normalized = normalizeCrmFileUrl(src, startupId);
    if (!normalized) return () => { active = false; };

    void resolveCrmFileUrl(normalized).then((url) => {
      if (!active) {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url?.startsWith('blob:') ? url : null;
      setResolved(url);
      setFailed(!url);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, startupId]);

  return { src: resolved, failed };
}

export interface CrmImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src?: string | null;
  startupId?: string | null;
  onError?: () => void;
}

export const CrmImage = ({ src, startupId, onError, alt = '', ...rest }: CrmImageProps) => {
  const { src: resolved, failed } = useCrmImageSrc(src, startupId);

  useEffect(() => {
    if (failed) onError?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  if (!resolved) return null;
  return <img {...rest} src={resolved} alt={alt} onError={() => onError?.()} />;
};

export default CrmImage;
