import { useState, useMemo, useEffect, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { investorApplicationsApi, InvestorApplication } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { InvestorFilters } from './components/InvestorFilters';
import { InvestorCard } from './components/InvestorCard';
import { AddInvestorModal } from './components/AddInvestorModal';
import { InvestorDetailsSheet } from './components/InvestorDetailsSheet';
import { InvestorApplicationsSkeleton } from './InvestorApplicationsSkeleton';
import { Inbox, Plus } from 'lucide-react';
import { PageTransition } from '../../styles/animations';

type InvestorStatus = 'new' | 'in_review' | 'approved' | 'rejected';

const PageContainer = styled.div`
  width: 100%;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-top: 72px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  ${PageTransition}

  @media (max-width: 768px) {
    padding-top: 72px;
  }

  @media (max-width: 640px) {
    padding-top: 64px;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
`;

const ControlsHeader = styled.div<{ $isCollapsed: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  left: ${({ $isCollapsed }) => ($isCollapsed ? '80px' : '260px')};
  z-index: 40;
  background: ${({ theme }) => theme.colors.bg.navbar};
  backdrop-filter: blur(10px);
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  box-sizing: border-box;

  @media (max-width: 768px) {
    left: 0;
    padding: ${({ theme }) => theme.spacing[3]};
    width: 100%;
    max-width: 100vw;
  }

  @media (max-width: 640px) {
    padding: 12px;
    height: 64px;
  }
`;

const KanbanBoard = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: ${({ theme }) => theme.spacing[4]};
  min-height: calc(100vh - 140px);
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.colors.border.secondary} transparent`};

  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 3px;
  }

  @media (max-width: 1200px) {
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
  }

  @media (max-width: 768px) {
    gap: 8px;
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const KanbanColumn = styled.div<{ $isOver?: boolean }>`
  flex: 0 0 420px;
  width: 420px;
  min-width: 420px;
  max-width: 420px;
  background: ${({ $isOver, theme }) =>
    $isOver ? `${theme.colors.accent.primary}12` : `${theme.colors.bg.secondary}80`};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
  border: 2px solid ${({ $isOver, theme }) =>
    $isOver ? theme.colors.accent.primary : 'transparent'};
  height: calc(100vh - 160px);
  max-height: calc(100vh - 160px);

  ${({ $isOver }) => $isOver && `
    transform: scale(1.01);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  `}

  @media (max-width: 1200px) {
    scroll-snap-align: start;
  }

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[2]};
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]};
`;

const ColumnTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.5px;
`;

const ColumnCount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
`;

const ColumnHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AddColumnButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
    transform: scale(1.1);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ColumnCards = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 100px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 4px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
  border: 2px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin: ${({ theme }) => theme.spacing[2]};
  min-height: 150px;

  svg {
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    opacity: 0.5;
  }
`;

const DraggableCardWrapper = styled.div<{ $isDragging: boolean }>`
  cursor: grab;
  transition: transform 0.1s, box-shadow 0.1s, opacity 0.2s;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1)};

  ${({ $isDragging }) => $isDragging && `
    & > * {
      border: 2px dashed rgba(99, 102, 241, 0.5) !important;
      background: rgba(99, 102, 241, 0.08) !important;
    }
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    cursor: grabbing;
  }
`;

const MobileColumnTabs = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    overflow-x: auto;
    gap: 4px;
    padding: 6px 12px;
    background: ${({ theme }) => theme.colors.bg.secondary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    flex-shrink: 0;

    &::-webkit-scrollbar { display: none; }
  }
`;

const MobileColumnTab = styled.button<{ $active: boolean; $color: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, theme }) => $active ? 'white' : theme.colors.text.secondary};

  &:hover {
    background: ${({ $active, $color, theme }) => $active ? $color : theme.colors.bg.tertiary};
  }
`;

const MobileTabCount = styled.span<{ $active: boolean }>`
  background: ${({ $active }) => $active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'};
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 11px;
`;

const MobileKanbanView = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    min-height: 0;
  }
`;

const MobileColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
`;

const DesktopKanbanBoard = styled(KanbanBoard)`
  @media (max-width: 640px) {
    display: none;
  }
`;

const SingleStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 420px);
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  min-height: calc(100vh - 140px);
  align-content: start;
  overflow-x: auto;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const SingleStatusHeader = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const SingleStatusTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SingleStatusCount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 4px 12px;
  border-radius: 12px;
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ConfirmModal = styled.div`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 380px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  text-align: center;
`;

const ConfirmText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  margin: 0 0 24px 0;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ConfirmButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${({ $primary }) => $primary ? `
    background: #ef4444;
    color: white;
    &:hover { background: #dc2626; }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    &:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
  `}
`;

const InvestorApplications = () => {
  const { t } = useTranslation();
  const { isCollapsed } = useOutletContext<{ isCollapsed: boolean }>();
  const { manager } = useAuth();

  const [applications, setApplications] = useState<InvestorApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<InvestorStatus>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InvestorStatus | 'all'>('all');
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<InvestorApplication | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<InvestorApplication | null>(null);

  const [draggedApp, setDraggedApp] = useState<InvestorApplication | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<InvestorStatus | null>(null);

  const statuses: InvestorStatus[] = ['new', 'in_review', 'approved', 'rejected'];

  const statusLabels: Record<InvestorStatus, string> = {
    new: t('investorApplications.status.new'),
    in_review: t('investorApplications.status.in_review'),
    approved: t('investorApplications.status.approved'),
    rejected: t('investorApplications.status.rejected'),
  };

  const statusColors: Record<InvestorStatus, string> = {
    new: '#3b82f6',
    in_review: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const orgId = manager?.organizationId || '';
        if (!orgId) { setIsLoading(false); return; }
        const response = await investorApplicationsApi.getAll(orgId);
        if (response.success && response.data) {
          setApplications(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch investor applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [manager?.organizationId]);

  const handleCardClick = (app: InvestorApplication) => {
    setSelectedApp(app);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSheetOpen(true);
      });
    });
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedApp(null), 300);
  };

  const handleAppUpdate = (updated: InvestorApplication) => {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedApp(updated);
  };

  const handleDeleteRequest = (app: InvestorApplication) => {
    setPendingDelete(app);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      const response = await investorApplicationsApi.delete(pendingDelete.id);
      if (response.success) {
        setApplications(prev => prev.filter(a => a.id !== pendingDelete.id));
      }
    } catch (error) {
      console.error('Failed to delete investor application:', error);
    } finally {
      setPendingDelete(null);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch =
        app.fundName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.country?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
      const matchesManager = !showMyOnly || app.assignedManagerId === manager?.id;
      return matchesSearch && matchesStatus && matchesManager;
    });
  }, [applications, searchQuery, selectedStatus, showMyOnly, manager?.id]);

  const getByStatus = (status: InvestorStatus) => {
    return filteredApplications.filter(a => a.status === status);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, app: InvestorApplication) => {
    setDraggedApp(app);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: InvestorStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, newStatus: InvestorStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedApp && draggedApp.status !== newStatus) {
      const oldStatus = draggedApp.status;
      const appId = draggedApp.id;

      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );

      try {
        await investorApplicationsApi.update(appId, { status: newStatus });

        await investorApplicationsApi.addActivity(appId, {
          action: 'status_change',
          managerId: manager?.id,
          managerName: manager?.name,
          details: `${statusLabels[oldStatus as InvestorStatus]} → ${statusLabels[newStatus]}`,
        });
      } catch (error) {
        console.error('Failed to update status:', error);
        setApplications(prev =>
          prev.map(a => a.id === appId ? { ...a, status: oldStatus } : a)
        );
      }
    }
    setDraggedApp(null);
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDragOverColumn(null);
  };

  const handleAddSubmit = async (data: any) => {
    const orgId = manager?.organizationId;
    if (!orgId) return;

    try {
      const response = await investorApplicationsApi.create({
        ...data,
        organizationId: orgId,
        status: 'new',
        source: 'Manual',
      });
      if (response.success && response.data) {
        setApplications(prev => [response.data!, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create investor application:', error);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <ControlsHeader $isCollapsed={isCollapsed}>
          <InvestorFilters
            searchQuery=""
            onSearchChange={() => {}}
            selectedStatus="all"
            onStatusChange={() => {}}
          />
        </ControlsHeader>
        <InvestorApplicationsSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ControlsHeader $isCollapsed={isCollapsed}>
        <InvestorFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onAddClick={() => setIsAddModalOpen(true)}
          showMyOnly={showMyOnly}
          onShowMyOnlyChange={setShowMyOnly}
        />
      </ControlsHeader>

      <AddInvestorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {selectedStatus !== 'all' ? (
        <SingleStatusGrid>
          <SingleStatusHeader>
            <SingleStatusTitle>{statusLabels[selectedStatus]}</SingleStatusTitle>
            <SingleStatusCount>{filteredApplications.length}</SingleStatusCount>
          </SingleStatusHeader>
          {filteredApplications.length > 0 ? (
            filteredApplications.map((app) => (
              <InvestorCard
                key={app.id}
                application={app}
                onClick={() => handleCardClick(app)}
                onDelete={handleDeleteRequest}
              />
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1' }}>
              <EmptyState>
                <Inbox size={48} />
                <div>{t('investorApplications.noApplications')}</div>
              </EmptyState>
            </div>
          )}
        </SingleStatusGrid>
      ) : (
      <>
      <MobileColumnTabs>
        {statuses.map((status) => {
          const count = getByStatus(status).length;
          return (
            <MobileColumnTab
              key={status}
              $active={mobileActiveColumn === status}
              $color={statusColors[status]}
              onClick={() => setMobileActiveColumn(status)}
            >
              {statusLabels[status]}
              <MobileTabCount $active={mobileActiveColumn === status}>{count}</MobileTabCount>
            </MobileColumnTab>
          );
        })}
      </MobileColumnTabs>

      <MobileKanbanView>
        <MobileColumnContent>
          {getByStatus(mobileActiveColumn).map((app) => (
            <InvestorCard
              key={app.id}
              application={app}
              onClick={() => handleCardClick(app)}
              onDelete={handleDeleteRequest}
            />
          ))}
          {getByStatus(mobileActiveColumn).length === 0 && (
            <EmptyState>
              <Inbox size={24} />
              <div>{t('investorApplications.noApplications')}</div>
            </EmptyState>
          )}
        </MobileColumnContent>
      </MobileKanbanView>

      <DesktopKanbanBoard>
        {statuses.map((status) => {
          const apps = getByStatus(status);
          return (
            <KanbanColumn
              key={status}
              $isOver={dragOverColumn === status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <ColumnHeader>
                <ColumnHeaderLeft>
                  <ColumnTitle>{statusLabels[status]}</ColumnTitle>
                  {status === 'new' && (
                    <AddColumnButton onClick={() => setIsAddModalOpen(true)} title={t('investorApplications.add')}>
                      <Plus />
                    </AddColumnButton>
                  )}
                </ColumnHeaderLeft>
                <ColumnCount>{apps.length}</ColumnCount>
              </ColumnHeader>
              <ColumnCards>
                {apps.map((app) => (
                  <DraggableCardWrapper
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app)}
                    onDragEnd={handleDragEnd}
                    $isDragging={draggedApp?.id === app.id}
                  >
                    <InvestorCard
                      application={app}
                      onClick={() => handleCardClick(app)}
                      onDelete={handleDeleteRequest}
                    />
                  </DraggableCardWrapper>
                ))}
                {apps.length === 0 && (
                  <EmptyState>
                    <Inbox size={24} />
                    <div>{t('investorApplications.noApplications')}</div>
                  </EmptyState>
                )}
              </ColumnCards>
            </KanbanColumn>
          );
        })}
      </DesktopKanbanBoard>
      </>
      )}

      {selectedApp && (
        <InvestorDetailsSheet
          application={selectedApp}
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          onUpdate={handleAppUpdate}
        />
      )}

      {pendingDelete && createPortal(
        <ConfirmOverlay onClick={() => setPendingDelete(null)}>
          <ConfirmModal onClick={e => e.stopPropagation()}>
            <ConfirmText>{t('investorApplications.confirmDelete')}</ConfirmText>
            <ConfirmButtons>
              <ConfirmButton onClick={() => setPendingDelete(null)}>
                {t('common.no')}
              </ConfirmButton>
              <ConfirmButton $primary onClick={handleDeleteConfirm}>
                {t('common.yes')}
              </ConfirmButton>
            </ConfirmButtons>
          </ConfirmModal>
        </ConfirmOverlay>,
        document.body
      )}
    </PageContainer>
  );
};

export default InvestorApplications;
