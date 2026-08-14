import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Plus, Check, UserCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';

const MyToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.accent.primary}15` : theme.colors.bg.card};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 640px) {
    height: 36px;
    padding: 0 10px;
    font-size: 14px;
    gap: 4px;
  }
`;

const FiltersContainer = styled.div`
  width: 100%;
  max-width: 100%;
  overflow: visible;
  box-sizing: border-box;
`;

const FiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;

  @media (max-width: 640px) {
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
  min-width: 0;
  max-width: calc(40% - 9px);

  @media (max-width: 1200px) {
    max-width: 60%;
  }

  @media (max-width: 640px) {
    max-width: none;
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-left: auto;
  flex-shrink: 0;

  @media (max-width: 640px) {
    gap: ${({ theme }) => theme.spacing[2]};
    display: none;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 240px;
  min-width: 160px;

  @media (max-width: 768px) {
    width: 180px;
    min-width: 140px;
  }

  @media (max-width: 640px) {
    flex: 1;
    width: auto;
    min-width: 100px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  padding-left: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all ${({ theme }) => theme.transitions.base};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  text-overflow: ellipsis;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.accent.primary}15`};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  @media (max-width: 640px) {
    height: 36px;
    padding-left: 36px;
    font-size: 14px;
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${({ theme }) => theme.spacing[3]};
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.colors.text.muted};

  @media (max-width: 640px) {
    left: 10px;
    width: 15px;
    height: 15px;
  }
`;

const DropdownWrapper = styled.div`
  position: relative;
`;

const DropdownButton = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px 0 14px;
  border: 1px solid ${({ theme, $isOpen }) =>
    $isOpen ? theme.colors.accent.primary : theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ theme, $isOpen }) =>
    $isOpen ? `0 0 0 3px ${theme.colors.accent.primary}15` : theme.shadows.sm};
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
    color: ${({ theme }) => theme.colors.text.muted};
  }

  @media (max-width: 640px) {
    height: 36px;
    padding: 0 10px 0 12px;
    font-size: 14px;
    gap: 6px;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean; $isClosing: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 180px;
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  padding: 6px;
  z-index: 100;
  transform-origin: top left;

  animation: ${({ $isClosing }) =>
    $isClosing ? 'dropdownClose 0.2s ease-out forwards' : 'dropdownOpen 0.2s ease-out forwards'};

  @keyframes dropdownOpen {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes dropdownClose {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
  }
`;

const DropdownItem = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $selected, theme }) =>
    $selected ? `${theme.colors.accent.primary}15` : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent.primary : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $selected }) => $selected ? '500' : '400'};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? `${theme.colors.accent.primary}20` : theme.colors.bg.tertiary};
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
    opacity: ${({ $selected }) => $selected ? 1 : 0};
    transform: ${({ $selected }) => $selected ? 'scale(1)' : 'scale(0.8)'};
    transition: all 0.15s ease;
  }
`;

const AddButtonText = styled.span`
  @media (max-width: 1024px) {
    display: none;
  }
`;

const MobileAddButton = styled.button`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${({ theme }) => theme.radius.md};
    border: none;
    background: ${({ theme }) => theme.colors.accent.primary};
    color: white;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover {
      background: ${({ theme }) => theme.colors.accent.primaryHover};
    }

    &:active {
      transform: scale(0.95);
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

type InvestorStatus = 'new' | 'in_review' | 'approved' | 'rejected';

interface InvestorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: InvestorStatus | 'all';
  onStatusChange: (status: InvestorStatus | 'all') => void;
  onAddClick?: () => void;
  showMyOnly?: boolean;
  onShowMyOnlyChange?: (value: boolean) => void;
}

export const InvestorFilters = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onAddClick,
  showMyOnly,
  onShowMyOnlyChange,
}: InvestorFiltersProps) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusLabels: Record<InvestorStatus | 'all', string> = {
    all: t('investorApplications.status.all'),
    new: t('investorApplications.status.new'),
    in_review: t('investorApplications.status.in_review'),
    approved: t('investorApplications.status.approved'),
    rejected: t('investorApplications.status.rejected'),
  };

  const statusOptions: (InvestorStatus | 'all')[] = ['all', 'new', 'in_review', 'approved', 'rejected'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const closeDropdown = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsDropdownOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const handleToggleDropdown = () => {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      setIsDropdownOpen(true);
      setIsClosing(false);
    }
  };

  const handleSelectStatus = (status: InvestorStatus | 'all') => {
    onStatusChange(status);
    closeDropdown();
  };

  return (
    <FiltersContainer>
      <FiltersRow>
        <LeftGroup>
          <SearchWrapper>
            <SearchIcon />
            <SearchInput
              placeholder={t('investorApplications.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </SearchWrapper>

          <DropdownWrapper ref={dropdownRef}>
            <DropdownButton
              $isOpen={isDropdownOpen}
              onClick={handleToggleDropdown}
            >
              {statusLabels[selectedStatus]}
              <ChevronDown size={16} />
            </DropdownButton>

            {(isDropdownOpen || isClosing) && (
              <DropdownMenu $isOpen={isDropdownOpen} $isClosing={isClosing}>
                {statusOptions.map((status) => (
                  <DropdownItem
                    key={status}
                    $selected={selectedStatus === status}
                    onClick={() => handleSelectStatus(status)}
                  >
                    {statusLabels[status]}
                    <Check />
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </DropdownWrapper>

          {onShowMyOnlyChange && (
            <MyToggleButton
              $active={showMyOnly || false}
              onClick={() => onShowMyOnlyChange(!showMyOnly)}
              title={t('investorApplications.myApplications')}
            >
              <UserCheck />
              <span>{t('investorApplications.myApplications')}</span>
            </MyToggleButton>
          )}

          {onAddClick && (
            <MobileAddButton onClick={onAddClick}>
              <Plus />
            </MobileAddButton>
          )}
        </LeftGroup>

        <RightGroup>
          <Button variant="primary" icon onClick={onAddClick}>
            <Plus size={20} />
            <AddButtonText>{t('investorApplications.add')}</AddButtonText>
          </Button>
        </RightGroup>
      </FiltersRow>
    </FiltersContainer>
  );
};
