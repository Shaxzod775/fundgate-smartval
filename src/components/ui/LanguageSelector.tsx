import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Globe, Check, ChevronDown } from 'lucide-react';

const SelectorWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 100;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-8px)')};
  transition: all 0.2s ease;
  overflow: hidden;
`;

const DropdownItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primaryLight : theme.colors.bg.dropdown};
  border: none;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const languages = [
  { code: 'ru', name: 'Русский', flag: 'RU' },
  { code: 'uz', name: "O'zbek", flag: 'UZ' },
  { code: 'en', name: 'English', flag: 'EN' },
];

interface LanguageSelectorProps {
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ showLabel = true }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <SelectorWrapper ref={wrapperRef}>
      <SelectorButton onClick={() => setIsOpen(!isOpen)}>
        <Globe />
        {showLabel && <span>{currentLanguage.name}</span>}
        <ChevronDown style={{ transform: isOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
      </SelectorButton>
      <Dropdown $isOpen={isOpen}>
        {languages.map((lang) => (
          <DropdownItem
            key={lang.code}
            $active={i18n.language === lang.code}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <span>{lang.name}</span>
            {i18n.language === lang.code && <Check />}
          </DropdownItem>
        ))}
      </Dropdown>
    </SelectorWrapper>
  );
};

export default LanguageSelector;
