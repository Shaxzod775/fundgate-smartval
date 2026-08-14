import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Search, LayoutGrid, List as ListIcon, ChevronDown, Plus, Check, UserCheck, Archive, Users } from 'lucide-react';
import { StartupStatus } from '../../../types';
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

  @media (max-width: 1024px) {
    padding: 0 10px;
    gap: 0;

    span {
      display: none;
    }
  }

  @media (max-width: 640px) {
    height: 36px;
    padding: 0 10px;
    font-size: 14px;
    gap: 4px;
  }
`;

const ArchiveToggleButton = styled(MyToggleButton)`
  position: relative;
`;

const ArchiveCount = styled.span<{ $active: boolean }>`
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.bg.tertiary};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.inverse : theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;

  @media (max-width: 1024px) {
    display: inline-flex;
  }
`;

const FiltersContainer = styled.div`
  width: 100%;
  max-width: 100%;
  overflow: visible;
  box-sizing: border-box;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[3]};
    margin-bottom: ${({ theme }) => theme.spacing[3]};
    padding-top: ${({ theme }) => theme.spacing[2]};
  }
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
  max-width: calc(100% - 180px);

  @media (max-width: 1200px) {
    max-width: calc(100% - 118px);
  }

  @media (max-width: 640px) {
    max-width: none;
    gap: ${({ theme }) => theme.spacing[3]};
    flex-wrap: wrap;
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
    width: 100%;
    min-width: unset;
    order: -1;
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
  flex-shrink: 0;
`;

const ManagerDropdownWrapper = styled(DropdownWrapper)`
  min-width: 190px;

  @media (max-width: 1120px) {
    min-width: 48px;
  }
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
  max-width: 220px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  /* Only the trailing chevron flips — a leading icon (Users) must stay upright. */
  svg:last-child {
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  }

  @media (max-width: 640px) {
    height: 36px;
    padding: 0 10px 0 12px;
    font-size: 14px;
    gap: 6px;
  }
`;

const DropdownButtonLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean; $isClosing: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 180px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 6px;
  z-index: 100;
  transform-origin: top left;

  /* Animation */
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

const DropdownItemLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 2px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const ToggleButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.bg.card : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.muted};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  box-shadow: ${({ $active, theme }) =>
    $active ? theme.shadows.sm : 'none'};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ $active, theme }) =>
    !$active && theme.colors.bg.tertiary};
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

interface StartupFiltersProps {
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: StartupStatus | 'all' | 'archived';
  onStatusChange: (status: StartupStatus | 'all' | 'archived') => void;
  onAddClick?: () => void;
  showMyOnly?: boolean;
  onShowMyOnlyChange?: (value: boolean) => void;
  managerOptions?: ManagerFilterOption[];
  selectedManagerId?: string;
  onManagerChange?: (managerId: string) => void;
  archiveCount?: number;
}

export interface ManagerFilterOption {
  id: string;
  name: string;
}

export const StartupFilters = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onAddClick,
  showMyOnly,
  onShowMyOnlyChange,
  managerOptions = [],
  selectedManagerId = 'all',
  onManagerChange,
  archiveCount = 0,
}: StartupFiltersProps) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [isManagerClosing, setIsManagerClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  const statusLabels: Record<StartupStatus | 'all' | 'archived', string> = {
    all: t('startups.status.all'),
    new: t('startups.status.new'),
    in_review: t('startups.status.in_review'),
    pipeline: t('startups.status.pipeline'),
    portfolio: t('startups.status.portfolio'),
    rejected: t('startups.status.rejected'),
    archived: t('startups.status.archived'),
  };

  const statusOptions: (StartupStatus | 'all')[] = ['all', 'new', 'in_review', 'pipeline', 'portfolio'];
  const managerFilterLabels: Record<'all' | 'unassigned', string> = {
    all: t('startups.managerFilter.all'),
    unassigned: t('startups.managerFilter.unassigned'),
  };
  const selectedManagerLabel =
    selectedManagerId === 'all' || selectedManagerId === 'unassigned'
      ? managerFilterLabels[selectedManagerId]
      : managerOptions.find((option) => option.id === selectedManagerId)?.name || managerFilterLabels.all;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        closeManagerDropdown();
      }
    };

    if (isDropdownOpen || isManagerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isManagerDropdownOpen]);

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

  const closeManagerDropdown = () => {
    setIsManagerClosing(true);
    setTimeout(() => {
      setIsManagerDropdownOpen(false);
      setIsManagerClosing(false);
    }, 200);
  };

  const handleToggleManagerDropdown = () => {
    if (isManagerDropdownOpen) {
      closeManagerDropdown();
    } else {
      setIsManagerDropdownOpen(true);
      setIsManagerClosing(false);
    }
  };

  const handleSelectStatus = (status: StartupStatus | 'all' | 'archived') => {
    onStatusChange(status);
    closeDropdown();
  };

  const handleSelectManager = (managerId: string) => {
    onManagerChange?.(managerId);
    closeManagerDropdown();
  };

  return (
    <FiltersContainer>
      <FiltersRow>
        <LeftGroup>
          <SearchWrapper>
            <SearchIcon />
            <SearchInput
              placeholder={t('startups.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </SearchWrapper>

          <DropdownWrapper ref={dropdownRef}>
            <DropdownButton
              $isOpen={isDropdownOpen}
              onClick={handleToggleDropdown}
            >
              <DropdownButtonLabel>
                {selectedStatus === 'archived' ? statusLabels.all : statusLabels[selectedStatus]}
              </DropdownButtonLabel>
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
                    <DropdownItemLabel>{statusLabels[status]}</DropdownItemLabel>
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
              title={t('startups.myStartups')}
            >
              <UserCheck />
              <span>{t('startups.myStartups')}</span>
            </MyToggleButton>
          )}

          {onManagerChange && (
            <ManagerDropdownWrapper ref={managerDropdownRef}>
              <DropdownButton
                $isOpen={isManagerDropdownOpen}
                onClick={handleToggleManagerDropdown}
                title={selectedManagerLabel}
              >
                <Users size={16} />
                <DropdownButtonLabel>{selectedManagerLabel}</DropdownButtonLabel>
                <ChevronDown size={16} />
              </DropdownButton>

              {(isManagerDropdownOpen || isManagerClosing) && (
                <DropdownMenu $isOpen={isManagerDropdownOpen} $isClosing={isManagerClosing}>
                  <DropdownItem
                    $selected={selectedManagerId === 'all'}
                    onClick={() => handleSelectManager('all')}
                  >
                    <DropdownItemLabel>{managerFilterLabels.all}</DropdownItemLabel>
                    <Check />
                  </DropdownItem>
                  <DropdownItem
                    $selected={selectedManagerId === 'unassigned'}
                    onClick={() => handleSelectManager('unassigned')}
                  >
                    <DropdownItemLabel>{managerFilterLabels.unassigned}</DropdownItemLabel>
                    <Check />
                  </DropdownItem>
                  {managerOptions.map((option) => (
                    <DropdownItem
                      key={option.id}
                      $selected={selectedManagerId === option.id}
                      onClick={() => handleSelectManager(option.id)}
                    >
                      <DropdownItemLabel>{option.name}</DropdownItemLabel>
                      <Check />
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              )}
            </ManagerDropdownWrapper>
          )}

          <ArchiveToggleButton
            $active={selectedStatus === 'archived'}
            onClick={() => onStatusChange(selectedStatus === 'archived' ? 'all' : 'archived')}
            title={statusLabels.archived}
          >
            <Archive />
            <span>{statusLabels.archived}</span>
            <ArchiveCount $active={selectedStatus === 'archived'}>{archiveCount}</ArchiveCount>
          </ArchiveToggleButton>

          {onAddClick && (
            <MobileAddButton onClick={onAddClick}>
              <Plus />
            </MobileAddButton>
          )}
        </LeftGroup>

        <RightGroup>
          <ViewToggle>
            <ToggleButton
              $active={viewMode === 'kanban'}
              onClick={() => onViewModeChange('kanban')}
              title={t('home.gridView')}
            >
              <LayoutGrid size={20} />
            </ToggleButton>
            <ToggleButton
              $active={viewMode === 'list'}
              onClick={() => onViewModeChange('list')}
              title={t('home.listView')}
            >
              <ListIcon size={20} />
            </ToggleButton>
          </ViewToggle>

          {onAddClick && (
            <Button variant="primary" icon onClick={onAddClick}>
              <Plus size={20} />
              <AddButtonText>{t('startups.addStartup')}</AddButtonText>
            </Button>
          )}
        </RightGroup>
      </FiltersRow>
    </FiltersContainer>
  );
};
