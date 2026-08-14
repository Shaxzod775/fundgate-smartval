import styled from 'styled-components';
import { CrmImage } from './CrmImage';

const Wrapper = styled.span<{ $size: number }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ theme }) => theme.radius.full};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ $size }) => Math.round($size * 0.44)}px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
`;

const Image = styled(CrmImage)`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

function initial(name?: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed[0] : '?';
}

export function ManagerAvatar({
  name,
  avatar,
  size = 24,
  className,
}: {
  name?: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <Wrapper $size={size} className={className} aria-hidden="true">
      {initial(name)}
      <Image src={avatar} alt="" />
    </Wrapper>
  );
}

export default ManagerAvatar;
