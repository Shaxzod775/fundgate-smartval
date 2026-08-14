export type StartupStatus = 'new' | 'in_review' | 'pipeline' | 'portfolio' | 'rejected';
export type StartupBoardLifecycleStatus = Exclude<StartupStatus, 'rejected'>;
export type StartupBoardColumnKind = 'system' | 'custom';

export interface StartupBoardColumnStage {
  id: string;
  label: string;
  description?: string;
  presetId?: string;
}

export interface StartupBoardColumn {
  id: string;
  kind: StartupBoardColumnKind;
  label: string;
  color: string;
  order: number;
  lifecycleStatus: StartupBoardLifecycleStatus;
  systemStatus?: StartupBoardLifecycleStatus;
  locked?: boolean;
  stages?: StartupBoardColumnStage[];
}

export interface StartupBoardSettings {
  version: 1;
  columns: StartupBoardColumn[];
  updatedAt?: Date | string;
}

export type StartupStage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C';
export type StartupSource = 'FundGate' | 'StartupBase' | 'Fund';
export type UserRole = 'admin' | 'manager';

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  startupBoardSettings?: StartupBoardSettings;
  createdAt: Date;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  organizationId: string;
  createdAt: Date;
  commentsSeen?: Record<string, string>;
}

export interface AIAnalysis {
  score: number; // FundGate Score (0-100)
  valuation: number; // SmartVal estimation
  strengths: string[];
  weaknesses: string[];
  marketAnalysis: string;
  teamAnalysis: string;
  productAnalysis: string;
  financialAnalysis: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass';
  generatedAt: Date;
}

export interface StartupBrief {
  companyName: string;
  website?: string;
  industry: string;
  description: string;
  stage: StartupStage;
  foundedYear: number;
  teamSize: number;
  revenue?: number;
  revenueGrowth?: number;
  fundingRequest: number;
  itpvFundingRequest?: number;
  totalRoundSize?: number;
  previousFunding?: number;
  useOfFunds: string;
  pitchDeckUrl?: string;
  founderName?: string;
  founderEmail?: string;
  founderPhone?: string;
  founderRole?: string;
  founderLinkedin?: string;
  country?: string;
  lastValuation?: number;
  revenueModel?: string[];
  valueDeliveryModel?: string;
  customerSegments?: string[];
  businessModel?: string;
  businessModelDescription?: string;
  customBusinessModel?: string;
  hasTechnology?: boolean;
  technologyDescription?: string;
  customerAcquisitionCost?: number;
  churnRate?: number;
  hasUsers?: boolean;
  userCount?: string;
  activeUsersPerMonth?: number;
  payingUsersPerMonth?: number;
  hasPayingCustomers?: boolean;
}

export interface FounderDetails {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  background: string;
  successfulProject?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    telegram?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface TeamMember {
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  background?: string;
  socialLinks?: Record<string, string>;
}

export interface InvestmentRound {
  source: string;
  investorName: string;
  amount: number;
  currency?: 'USD' | 'EUR' | 'UZS';
  date: string;
}

export interface FileUrls {
  pitchDeck?: string;
  onePager?: string;
  financialModel?: string;
  logo?: string;
}

export interface Materials {
  financialModelDescription?: string;
  currentRevenueBurnRate?: string;
  futurePlans?: string;
  videoLink?: string;
}

export interface Comment {
  id: string;
  startupId: string;
  text: string;
  createdAt: Date | string | { _seconds: number; _nanoseconds?: number };
  senderType?: 'founder' | 'manager';
  senderName?: string;
  senderEmail?: string;
  managerId?: string;
  managerName?: string;
  managerAvatar?: string;
}

export type ActivityAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'commented'
  | 'updated'
  | 'deal_closed'
  | 'file_uploaded'
  | 'moved_to_pipeline'
  | 'moved_to_review'
  | 'moved_to_portfolio'
  | 'rejected'
  | 'deleted_by_founder';

export interface ActivityLog {
  id: string;
  startupId?: string;
  startupName?: string;
  managerId?: string;
  managerName?: string;
  managerAvatar?: string;
  founderName?: string;
  founderEmail?: string;
  action: ActivityAction;
  details?: string;
  oldValue?: string;
  newValue?: string;
  amount?: number;
  fileName?: string;
  createdAt: Date;
}

export interface FundGateScores {
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  E?: number;
  F?: number;
  total?: number;
}

export interface SmartValDetails {
  method?: string;
  confidence_score?: number;
  breakdown?: Record<string, { score: number; weight: number; comment?: string }>;
  recommendations?: string[];
  final_valuation?: number;
  valuation_low?: number;
  valuation_high?: number;
}

export interface AIRecommendations {
  strengths?: string[];
  weaknesses?: string[];
  overall_comment?: string;
  detailed_comment?: string;
  recommendation?: string;
}

export interface StartupMetrics {
  reportDate?: string;   // Source reporting period/date
  arr?: number;          // Annual Recurring Revenue
  mrr?: number;          // Monthly Recurring Revenue
  cogs?: number;         // Cost of Goods Sold for the reporting period
  gmv?: number;          // Gross Merchandise Volume
  arpu?: number;         // Average Revenue Per User
  ltv?: number;          // Lifetime Value
  cac?: number;          // Customer Acquisition Cost
  grossMargin?: number;  // % Gross Margin
  burnRate?: number;     // $/month Burn Rate
  churnRate?: number;    // % Churn Rate
  runway?: number;       // months of runway
  yoyGrowth?: number;    // year-over-year growth rate
  qoqGrowth?: number;    // quarter-over-quarter growth rate
  momGrowth?: number;    // month-over-month growth rate
  ebitdaMargin?: number;
  currentRatio?: number;
  ebitda?: number;
  payingCustomers?: number;
  netProfit?: number;
  netMargin?: number;
  cashAtBank?: number;
  totalDebt?: number;
  debtToEquity?: number;
  lastValuation?: number;
}

export interface MetricSnapshot {
  id?: string;
  date: string;          // "2026-01" or "2026-Q1"
  period: 'monthly' | 'quarterly';
  metrics: StartupMetrics;
  addedBy?: string;
  addedByName?: string;
  createdAt?: Date;
}

export interface CustomMetric {
  id: string;
  name: string;
  values: { date: string; value: number }[];
}

export type HealthColor = 'green' | 'yellow' | 'red';

export interface MonitoringScore {
  revenueGrowth?: HealthColor;
  grossMargin?: HealthColor;
  burnMultiple?: HealthColor;
  runway?: HealthColor;
  cashFlowTrend?: HealthColor;
  ltvCac?: HealthColor;
  payback?: HealthColor;
  totalScore?: number; // 0-14 (2 pts each * 7 metrics)
}

export type DDReviewTrackStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type DDRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DDReviewTrackKey = 'finance' | 'legal' | 'technical' | 'team' | 'market' | 'corporate' | 'documents';

export interface DDReviewTrack {
  status: DDReviewTrackStatus;
  reviewerId?: string;
  reviewerName?: string;
  dueDate?: string;
  riskLevel?: DDRiskLevel;
  score?: number;
  conclusion?: string;
  files?: StartupDocumentFile[];
  updatedAt?: Date | string;
}

export type DDReviewSet = Partial<Record<DDReviewTrackKey, DDReviewTrack>>;

export type PendingChangeStatus = 'pending' | 'manager_approved' | 'approved' | 'rejected';

export interface PendingChangeSet {
  id: string;
  startupId: string;
  founderEmail?: string;
  changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> | Record<string, unknown>;
  patch?: Record<string, unknown>;
  fieldChanges?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  status: PendingChangeStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date | string;
  reviewNote?: string;
  managerReviewedBy?: string;
  managerReviewedByName?: string;
  managerReviewedAt?: Date | string;
  directorReviewedBy?: string;
  directorReviewedByName?: string;
  directorReviewedAt?: Date | string;
  directorReviewNote?: string;
  createdAt?: Date | string;
}

export type DocumentItemStatus = 'requested' | 'uploaded' | 'approved' | 'changes_requested' | 'waived';
export type DocumentRequestStatus = 'requested' | 'partially_uploaded' | 'submitted' | 'completed' | 'cancelled';

export interface StartupDocumentFile {
  id: string;
  fileName: string;
  url: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedAt: Date | string;
  uploadedBy: 'founder' | 'manager';
  uploadedByName?: string;
  country?: string;
}

export type DocumentInputType = 'file' | 'url';
export type DocumentCategory = 'presentation' | 'legal' | 'financial' | 'traction' | 'investment' | 'other';

export interface DocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  status: DocumentItemStatus;
  requestedAt?: Date | string;
  dueDate?: string | null;
  files?: StartupDocumentFile[];
  reviewNote?: string;
  reviewedAt?: Date | string;
  reviewedBy?: string;
  reviewedByName?: string;
  category?: DocumentCategory;
  inputType?: DocumentInputType;
  acceptedFormats?: string;
  requiresCountry?: boolean;
}

export interface DocumentRequest {
  id: string;
  templateId: string;
  title: string;
  message?: string;
  dueDate?: string | null;
  status: DocumentRequestStatus;
  requestedBy?: string;
  requestedByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: DocumentRequestItem[];
}

export type StartupRoadmapStepId =
  | 'incoming'
  | 'pitch'
  | 'kyc'
  | 'data_room'
  | 'screening'
  | 'ic_prep'
  | 'investment_committee'
  | 'closing'
  | 'portfolio';

export type StartupRoadmapStepStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type StartupRoadmapDecision = 'pending' | 'approved' | 'rejected' | 'rework';

export interface StartupRoadmapStep {
  id: StartupRoadmapStepId | string;
  status: StartupRoadmapStepStatus;
  owner?: string;
  dueDate?: string;
  note?: string;
  completedAt?: Date | string;
  decision?: StartupRoadmapDecision;
  updatedAt?: Date | string;
}

export interface StartupRoadmap {
  steps: Partial<Record<string, StartupRoadmapStep>>;
  updatedAt?: Date | string;
}

export interface CrossFundApplication {
  organizationId: string;
  organizationName: string;
  status: StartupStatus;
  updatedAt?: Date | string | { _seconds: number; _nanoseconds?: number };
  investmentAmount?: number;
  commitmentStatus?: 'considering' | 'approved' | 'rejected';
}

export type InvestmentMemoLanguage = 'ru' | 'en';
export type InvestmentMemoDecision = 'invest' | 'review_later' | 'pass' | 'insufficient_data';
export type InvestmentMemoStatus = 'generated' | 'failed';
export type InvestmentMemoProvider = 'deepseek' | 'gemini';

export interface InvestmentMemoVisualAssets {
  mode: 'codex_visual_memo';
  generatedBy: 'fundgate-memo-agent';
  visualToolStatus?: 'connected' | 'internal_renderer' | 'not_configured';
  charts: Array<{
    id: string;
    title: string;
    description: string;
    svg: string;
    sourceFields: string[];
  }>;
  imagePrompts: Array<{
    id: string;
    title: string;
    tool: 'codex.exec';
    command: 'imagine';
    kind: 'chart_image';
    prompt: string;
    negativePrompt: string;
    chartSpec: {
      title: string;
      chartType: 'bar' | 'metric_cards';
      points: Array<{ label: string; value: number; sourceField: string; unit?: string }>;
      note?: string;
    };
    status: 'prompt_ready';
    sourceFields: string[];
  }>;
  toolRequests?: Array<{
    id: string;
    title: string;
    tool: 'codex.exec';
    command: 'imagine';
    kind: 'chart_image';
    prompt: string;
    negativePrompt: string;
    chartSpec: {
      title: string;
      chartType: 'bar' | 'metric_cards';
      points: Array<{ label: string; value: number; sourceField: string; unit?: string }>;
      note?: string;
    };
    status: 'prompt_ready';
    sourceFields: string[];
  }>;
  generatedImages?: Array<{
    id: string;
    title: string;
    tool: 'codex.exec';
    command: 'imagine';
    kind: 'chart_image';
    prompt: string;
    negativePrompt: string;
    chartSpec: {
      title: string;
      chartType: 'bar' | 'metric_cards';
      points: Array<{ label: string; value: number; sourceField: string; unit?: string }>;
      note?: string;
    };
    sourceFields: string[];
    status: 'generated' | 'failed';
    imageUrl?: string;
    imagePath?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    generatedAt?: string;
    error?: string;
  }>;
  notes: string[];
}

export interface InvestmentMemoSummary {
  id: string;
  title: string;
  language: InvestmentMemoLanguage;
  status: InvestmentMemoStatus;
  decision?: InvestmentMemoDecision;
  summary?: string;
  markdown?: string;
  missingData?: string[];
  modelNotes?: string[];
  visualAssets?: InvestmentMemoVisualAssets;
  designSnapshot?: Record<string, unknown>;
  model?: string;
  provider?: InvestmentMemoProvider;
  generatedAt?: Date | string;
  generatedBy?: string | null;
  generatedByName?: string | null;
  storagePath?: string;
  url?: string;
  fileName?: string;
  source?: 'generated' | 'uploaded';
  uploadedAt?: Date | string;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  contentType?: string;
  size?: number;
  docxStoragePath?: string;
  docxUrl?: string;
  docxFileName?: string;
  htmlStoragePath?: string;
  htmlUrl?: string;
  htmlFileName?: string;
  error?: string;
}

export type InvestmentCommitteeWorkflowStatus =
  | 'draft'
  | 'screening'
  | 'documentation'
  | 'protocol'
  | 'signing'
  | 'completed'
  | 'cancelled';
export type InvestmentCommitteeTrackStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type InvestmentCommitteeDecision = 'pending' | 'selected' | 'rejected' | 'rework' | 'deferred';
export type InvestmentCommitteeProtocolStatus = 'draft' | 'ready' | 'approved' | 'rejected' | 'changes_requested';
export type InvestmentCommitteeSignatureStatus = 'pending' | 'signed' | 'scan_received' | 'original_received' | 'declined';

export interface InvestmentCommitteeTrack {
  status: InvestmentCommitteeTrackStatus;
  reviewerId?: string;
  reviewerName?: string;
  conclusion?: string;
  note?: string;
  updatedAt?: Date | string;
}

export interface InvestmentCommitteeWorkflow {
  id: string;
  startupId: string;
  organizationId: string;
  status: InvestmentCommitteeWorkflowStatus;
  currentStage?: string;
  preliminaryAnalysis?: {
    finance?: InvestmentCommitteeTrack;
    technical?: InvestmentCommitteeTrack;
    anastasiaDiscussion?: {
      status?: InvestmentCommitteeTrackStatus;
      participantName?: string;
      notes?: string;
      discussedAt?: string;
    };
    shortlistDecision?: {
      decision?: InvestmentCommitteeDecision;
      selected?: boolean;
      retainedProjectCount?: number;
      rationale?: string;
    };
  };
  documentationPackage?: {
    status?: InvestmentCommitteeTrackStatus;
    folderName?: string;
    folderPath?: string;
    preparedBy?: string | null;
    preparedByName?: string | null;
    preparedAt?: Date | string;
    documents?: Array<{
      id: string;
      title: string;
      category?: string;
      source?: string;
      status?: string;
      url?: string;
    }>;
    checklist?: Array<{ id: string; title: string; status: 'pending' | 'done' | 'blocked' }>;
    note?: string;
  };
  protocol?: {
    status?: InvestmentCommitteeProtocolStatus;
    protocolNumber?: string;
    meetingDate?: string;
    presentedProjects?: Array<{
      startupId?: string;
      startupName?: string;
      status?: string;
      industry?: string;
      stage?: string;
      terms?: Record<string, unknown>;
    }>;
    voting?: {
      for?: number;
      against?: number;
      abstain?: number;
      totalMembers?: number;
      quorumRequired?: number;
      result?: InvestmentCommitteeDecision;
    };
    conditions?: string[];
    adjustments?: string;
    committeeChanges?: string[];
    defenseNotes?: string;
    latestExport?: {
      id: string;
      fileName: string;
      htmlUrl: string;
      htmlStoragePath?: string;
      generatedAt?: Date | string;
      generatedBy?: string | null;
      generatedByName?: string | null;
    };
  };
  signatures?: {
    requiredCount?: number;
    members?: Array<{
      id: string;
      name?: string;
      role?: string;
      status?: InvestmentCommitteeSignatureStatus;
      signatureType?: string;
      isRemote?: boolean;
      scanUrl?: string;
      originalStatus?: string;
      signedAt?: Date | string;
      comment?: string;
      eSignatureRequestId?: string;
      eSignatureCertificateUrl?: string;
    }>;
    remoteSignature?: {
      enabled?: boolean;
      memberId?: string;
      memberName?: string;
      scanReceived?: boolean;
      scanReceivedAt?: Date | string;
      scanUrl?: string;
      originalStatus?: string;
      originalReceivedAt?: Date | string;
      localOriginalProtocolUrl?: string;
      remoteScannedProtocolUrl?: string;
      remoteOriginalProtocolUrl?: string;
      combinedProtocolStatus?: string;
      bundleNote?: string;
      eSignatureRequired?: boolean;
      eSignatureStatus?: 'not_requested' | 'pending' | 'signed' | 'expired' | 'revoked' | string;
      eSignatureRequestId?: string;
      eSignatureSignerName?: string;
      eSignatureSignerEmail?: string;
      eSignatureExpiresAt?: Date | string;
      eSignedAt?: Date | string;
      eSignatureCertificateUrl?: string;
      legalNote?: string;
    };
  };
  history?: Array<Record<string, unknown>>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  updatedBy?: string | null;
  updatedByName?: string | null;
}

export interface Startup {
  id: string;
  platformIdentityKey?: string;
  dataRoomUrl?: string;
  dataRoomApprovedUrl?: string;
  dataRoomStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  dataRoomReviewNote?: string;
  telegramChatId?: string;
  telegramChatTitle?: string;
  logo: string;
  brief: StartupBrief;

  status: StartupStatus;
  boardColumnId?: string;
  greyZone?: boolean;
  score?: number; // Manual or override score
  source: StartupSource;
  assignedManagerId?: string;
  assignedManager?: Manager;

  founder?: FounderDetails;
  teamMembers?: TeamMember[];
  investments?: InvestmentRound[];
  fileUrls?: FileUrls;
  materials?: Materials;

  aiAnalysis?: AIAnalysis;
  fundGateScores?: FundGateScores;
  smartValDetails?: SmartValDetails;
  aiRecommendations?: AIRecommendations;
  analysisStatus?: 'queued' | 'processing' | 'completed' | 'failed' | 'blocked';
  analysisError?: string;
  investmentMemo?: InvestmentMemoSummary;
  investmentMemoStatus?: InvestmentMemoStatus;
  investmentMemoGeneratedAt?: Date | string;
  smartValRequest?: {
    requestedAt?: Date | string;
    requestedBy?: string | null;
    requestedByName?: string | null;
    founderEmail?: string;
    emailSent?: boolean;
  };
  smartValRequestedAt?: Date | string;
  investmentCommittee?: InvestmentCommitteeWorkflow;
  investmentCommitteeStatus?: InvestmentCommitteeWorkflowStatus;
  sentToCommittee?: { at?: string; by?: string; byName?: string };
  portfolioPromotion?: {
    committeeId?: string;
    at?: string;
    by?: string | null;
    byName?: string | null;
  };

  comments: Comment[];
  activityLog: ActivityLog[];
  documentRequests?: DocumentRequest[];
  roadmap?: StartupRoadmap;
  crossFundApplications?: CrossFundApplication[];
  ddReviews?: DDReviewSet;
  portfolioWorkbookEdits?: {
    capTable?: Record<string, Record<string, string | number | null>>;
  };
  completionPercent?: number;
  pendingChangeCount?: number;
  lastQuarterlyReportAt?: Date | string;
  lastQuarterlyReportReviewedAt?: Date | string;
  lastQuarterlyReportId?: string;
  lastQuarterlyReportPeriod?: { year: number; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' };
  lastQuarterlyReportStatus?: 'submitted' | 'in_review' | 'approved' | 'changes_requested';
  quarterlyReportsCount?: number;

  isArchived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;

  portfolioType?: 'investment' | 'program';
  portfolioSegment?: 'marketplace' | 'fintech' | 'saas' | 'ecommerce' | 'services' | 'hardware' | 'other' | null;

  fundConsiderationAmount?: number;
  investmentAmount?: number;
  investmentCurrency?: 'USD' | 'EUR' | 'UZS';
  investmentDate?: Date;
  valuationType?: 'pre-money' | 'post-money';
  valuation?: number;
  isCoInvestment?: boolean;

  metrics?: StartupMetrics;
  metricsHistory?: MetricSnapshot[];
  customMetrics?: CustomMetric[];
  monitoringScore?: MonitoringScore;
  portfolioResponsiblePerson?: string;

  cabinetId?: string;
  cabinetLogin?: string;

  resubmissionCount?: number;
  finallyBlocked?: boolean;
  finallyBlockedAt?: Date;
  finallyBlockedBy?: string;
  finallyBlockReason?: string;
  previousVersions?: StartupPreviousVersion[];

  createdAt: Date;
  updatedAt: Date;
}

export interface StartupPreviousVersion {
  versionAt: string | Date;
  rejectionReason?: string;
  status?: string;
  brief?: Partial<StartupBrief>;
  formData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DashboardStats {
  totalStartups: number;
  newStartups: number;
  inReview: number;
  pipeline: number;
  portfolio: number;
  rejected: number;
  totalValuation: number;
  averageScore: number;
}

export interface ManagerActivity {
  manager: Manager;
  activeProjects: number;
  lastActivity: Date;
  recentActions: ActivityLog[];
}

export interface ManagerPerformance {
  managerId: string;
  manager: Manager;

  totalStartups: number;
  portfolioStartups: number;
  pipelineStartups: number;
  reviewStartups: number;
  newStartups: number;
  rejectedStartups: number;

  totalPortfolioValue: number;
  averageAIScore: number;

  conversionRate: number; // % от new до portfolio
  successRate: number; // % успешных сделок

  monthlyDealGoal: number;
  completedDeals: number;
  dealGoalProgress: number; // %

  portfolioValueGoal: number;
  portfolioValueProgress: number; // %

  targetAIScore: number;
  currentAIScore: number;

  last7DaysActivity: {
    date: Date;
    actions: number;
  }[];

  teamRank: number;
  totalManagers: number;
  performanceScore: number; // 0-100
}

export type InvestorApplicationStatus = 'new' | 'in_review' | 'approved' | 'rejected';
export type InvestorApplicationSource = 'Platform' | 'Manual';

export interface InvestorApplication {
  id: string;
  organizationId: string;
  fundName: string;
  email: string;
  phone?: string;
  country?: string;
  stages: string[];
  checkFrom?: number;
  checkTo?: number;
  industries: string[];
  request?: string;
  status: InvestorApplicationStatus;
  source: InvestorApplicationSource;
  platformInvestorId?: string;
  assignedManagerId?: string;
  assignedManager?: Manager;
  comments: Comment[];
  activityLog: ActivityLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestorApplicationFilters {
  status?: InvestorApplicationStatus[];
  source?: InvestorApplicationSource[];
  assignedManagerId?: string;
  searchQuery?: string;
}

export interface StartupCabinet {
  id: string;
  startupId: string;
  login: string;
  email: string;
  createdAt: string;
  lastResubmitAt?: string;
  isActive: boolean;
}

export type ReportType = 'financial' | 'tasks' | 'other';

export interface ReportFile {
  url: string;
  fileName: string;
  contentType: string;
  size?: number;
  storagePath?: string;
}

export interface QuarterlyReport {
  id: string;
  startupId: string;
  period: {
    year: number;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  };
  metrics: {
    mrr?: number | null;
    cogs?: number | null;
    arr?: number | null;
    revenue?: number | null;
    burn?: number | null;
    runway?: number | null;
    customMetrics?: Record<string, string | number | null>;
  };
  narrative: {
    traction?: string;
    risks?: string;
    asks?: string;
  };
  files: ReportFile[];
  status: 'submitted' | 'in_review' | 'approved' | 'changes_requested';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export type StartupReport = QuarterlyReport;

export type PortfolioRadarSeverity = 'critical' | 'attention' | 'opportunity' | 'data_gap';

export interface PortfolioRadarSignal {
  id: string;
  startupId: string;
  startupName: string;
  type: string;
  severity: PortfolioRadarSeverity;
  title: string;
  description: string;
  source: string;
  actionLabel: string;
  actionRoute: string;
  createdAt: string;
}

export interface PortfolioRadarResult {
  summary: {
    totalPortfolio: number;
    criticalCount: number;
    attentionCount: number;
    opportunitiesCount: number;
    dataGapsCount: number;
    needsReviewCount: number;
    overdueRequestsCount: number;
    staleDataCount: number;
  };
  signals: PortfolioRadarSignal[];
  followOnCandidates: PortfolioRadarSignal[];
  dataGaps: PortfolioRadarSignal[];
  generatedAt: string;
}

export interface QuarterlyReportDigest {
  id?: string;
  reportId: string;
  startupId: string;
  period: QuarterlyReport['period'];
  summary: string;
  metricChanges: string[];
  risks: string[];
  asks: string[];
  suggestedQuestions: string[];
  recommendedAction: string;
  model: string;
  generatedAt: string;
  isAiGenerated: boolean;
}

export interface StartupFilters {
  status?: StartupStatus[];
  stage?: StartupStage[];
  source?: StartupSource[];
  assignedManagerId?: string;
  searchQuery?: string;
  scoreMin?: number;
  scoreMax?: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  manager: Manager;
  organization: Organization;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'faq' | 'guide' | 'tutorial';
  icon?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface News {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source: string;
  sourceUrl?: string;
  externalUrl?: string;
  imageUrl?: string;
  tags: string[];
  publishedAt: Date;
  isExternal?: boolean;
}
