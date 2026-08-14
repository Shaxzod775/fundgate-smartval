import type { CrossFundApplication, StartupBoardSettings } from '../types';
export type { CrossFundApplication } from '../types';
import { fileNameFromUrl, toAuthenticatedCrmFileUrl, toSafeCrmFileHref } from '../utils/crmFileUrl';
import { safeExternalHref } from '../utils/safeUrl';

export interface StartupBoardHistoryEntry {
  id: string;
  action: 'update' | 'delete_column' | 'restore';
  columnsCount: number;
  columnLabels: string[];
  changedBy: string | null;
  changedByName: string | null;
  replacedAt: string | null;
}

export function isTestBackendHostname(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.vercel.sh')
  );
}

export function isTestEnvHost(): boolean {
  if (typeof window === 'undefined') return false;
  return isTestBackendHostname(window.location.hostname);
}

const PROD_API = 'https://crm-api-1081551319508.us-central1.run.app';
const DEV_API = 'https://api-dev-honmqtebqa-uc.a.run.app';
const PROD_AI = 'https://api.fundgate.uz/crm-ai';
const DEV_AI = 'https://crm-ai-service-dev-honmqtebqa-uc.a.run.app';

const useTestBackends = isTestEnvHost();
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (useTestBackends ? DEV_API : PROD_API);
export const CRM_API_BASE_URL = API_BASE_URL;

export function normalizeCrmFileUrl(fileUrl?: string | null, startupId?: string | null): string {
  return toAuthenticatedCrmFileUrl(fileUrl, CRM_API_BASE_URL, startupId);
}

export function safeCrmFileHref(fileUrl?: string | null, startupId?: string | null): string {
  return toSafeCrmFileHref(fileUrl, CRM_API_BASE_URL, startupId);
}
const AI_API_URL = useTestBackends ? DEV_AI : (import.meta.env.VITE_AI_API_URL || PROD_AI);
if (typeof window !== 'undefined') {
  console.info(`[funds-crm] backend: ${useTestBackends ? 'dev (fundgate-test DB)' : 'prod ((default) DB)'}`);
}

export const LEGACY_CRM_AUTH_PREFIX = 'legacy-crm:';
export const AUTH_EXPIRED_EVENT = 'funds-crm:auth-expired';
let isHandlingAuthExpired = false;

function shouldSendBearerToken(token: string | null): token is string {
  return Boolean(token && !token.startsWith(LEGACY_CRM_AUTH_PREFIX));
}

function shouldHandleAuthExpired(endpoint: string, status: number): boolean {
  if (status !== 401) return false;
  if (!endpoint.startsWith('/crm/')) return false;
  if (endpoint === '/crm/auth/login' || endpoint.startsWith('/crm/auth/login?')) return false;
  if (endpoint === '/crm/register' || endpoint.startsWith('/crm/register?')) return false;
  return Boolean(localStorage.getItem('authToken'));
}

function handleAuthExpired(): void {
  if (isHandlingAuthExpired || typeof window === 'undefined') return;
  isHandlingAuthExpired = true;

  localStorage.removeItem('authToken');
  localStorage.removeItem('manager');
  localStorage.removeItem('organization');
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/register') {
    window.history.replaceState(null, '', '/login');
  }
}

function getAiAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const managerHints = (() => {
    try {
      const raw = localStorage.getItem('manager');
      if (!raw) return null;
      return JSON.parse(raw) as { id?: string; name?: string; email?: string; login?: string; organizationId?: string };
    } catch {
      return null;
    }
  })();
  const organizationId = (() => {
    if (managerHints?.organizationId) return managerHints.organizationId;
    try {
      const raw = localStorage.getItem('organization');
      if (!raw) return null;
      const organization = JSON.parse(raw) as { id?: string };
      return organization.id || null;
    } catch {
      return null;
    }
  })();

  return {
    ...(shouldSendBearerToken(token) ? { Authorization: `Bearer ${token}` } : {}),
    ...(managerHints?.id ? { 'x-manager-id': managerHints.id } : {}),
    ...(managerHints?.name ? { 'x-manager-name': encodeHeaderText(managerHints.name) } : {}),
    ...(managerHints?.email ? { 'x-manager-email': managerHints.email } : {}),
    ...(managerHints?.login ? { 'x-manager-login': managerHints.login } : {}),
    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
  };
}

function encodeHeaderText(value?: string | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? encodeURIComponent(text) : undefined;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('authToken');
  const managerId = (() => {
    try {
      const raw = localStorage.getItem('manager');
      if (!raw) return null;
      const manager = JSON.parse(raw) as { id?: string };
      return manager.id || null;
    } catch {
      return null;
    }
  })();
  const managerHints = (() => {
    try {
      const raw = localStorage.getItem('manager');
      if (!raw) return null;
      return JSON.parse(raw) as { email?: string; login?: string; name?: string; organizationId?: string };
    } catch {
      return null;
    }
  })();
  const organizationId = (() => {
    if (managerHints?.organizationId) return managerHints.organizationId;
    try {
      const raw = localStorage.getItem('organization');
      if (!raw) return null;
      const organization = JSON.parse(raw) as { id?: string };
      return organization.id || null;
    } catch {
      return null;
    }
  })();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;

  const headers: HeadersInit = {
    ...(!isFormData && hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(shouldSendBearerToken(token) ? { Authorization: `Bearer ${token}` } : {}),
    ...(managerId ? { 'x-manager-id': managerId } : {}),
    ...(managerHints?.name ? { 'x-manager-name': encodeHeaderText(managerHints.name) } : {}),
    ...(managerHints?.email ? { 'x-manager-email': managerHints.email } : {}),
    ...(managerHints?.login ? { 'x-manager-login': managerHints.login } : {}),
    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = null; }
    if (shouldHandleAuthExpired(endpoint, response.status)) {
      handleAuthExpired();
    }
    return {
      success: false,
      error: errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      message: errorData?.message,
      data: errorData?.data,
    } as ApiResponse<T>;
  }

  const data = await response.json();
  return data;
}

export async function openCrmFile(fileUrl?: string | null, startupId?: string | null): Promise<void> {
  fileUrl = normalizeCrmFileUrl(fileUrl, startupId);
  if (!fileUrl) return;
  const idx = fileUrl.indexOf('/crm/files/');
  if (idx === -1) {
    const safeUrl = safeExternalHref(fileUrl);
    if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const win = window.open('about:blank', '_blank');
  try {
    const path = fileUrl.slice(idx);
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetchApi<{ url: string }>(`${path}${sep}json=1`);
    const signed = res.success && res.data?.url ? res.data.url : null;
    const safeSignedUrl = safeExternalHref(signed);
    if (safeSignedUrl) {
      if (win) win.location.href = safeSignedUrl;
      else window.open(safeSignedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const fileResponse = await fetch(`${API_BASE_URL}${path}`, {
      headers: getAiAuthHeaders(),
    });
    if (!fileResponse.ok) {
      if (shouldHandleAuthExpired(path, fileResponse.status)) handleAuthExpired();
      throw new Error(`Failed to open CRM file: ${fileResponse.status}`);
    }

    const blob = await fileResponse.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (win) {
      win.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  } catch {
    if (win) {
      win.document.body.style.fontFamily = 'sans-serif';
      win.document.body.style.padding = '24px';
      win.document.body.innerText = 'Не удалось открыть файл — нет доступа или истёк токен.';
    }
  }
}

const CRM_FILE_SIGNATURE_TTL_MS = 8 * 60 * 1000;
const CRM_FILE_FAILURE_TTL_MS = 30 * 1000;

interface CrmFileSignature {
  url: string | null;
  streamable: boolean;
}

const crmFileSignatureCache = new Map<string, { value: CrmFileSignature; expiresAt: number }>();
const crmFileSignatureInFlight = new Map<string, Promise<CrmFileSignature>>();

async function crmFileSignature(path: string): Promise<CrmFileSignature> {
  const cached = crmFileSignatureCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = crmFileSignatureInFlight.get(path);
  if (pending) return pending;

  const request = (async (): Promise<CrmFileSignature> => {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetchApi<{ url?: string | null; mode?: string }>(`${path}${sep}json=1`);
    if (res.success && res.data?.url) return { url: res.data.url, streamable: false };
    return { url: null, streamable: Boolean(res.success) };
  })();

  crmFileSignatureInFlight.set(path, request);
  try {
    const value = await request;
    crmFileSignatureCache.set(path, {
      value,
      expiresAt: Date.now() + (value.url ? CRM_FILE_SIGNATURE_TTL_MS : CRM_FILE_FAILURE_TTL_MS),
    });
    return value;
  } catch {
    const value: CrmFileSignature = { url: null, streamable: false };
    crmFileSignatureCache.set(path, { value, expiresAt: Date.now() + CRM_FILE_FAILURE_TTL_MS });
    return value;
  } finally {
    crmFileSignatureInFlight.delete(path);
  }
}

export async function resolveCrmFileUrl(fileUrl?: string | null): Promise<string | null> {
  if (!fileUrl) return null;
  const idx = fileUrl.indexOf('/crm/files/');
  if (idx === -1) return fileUrl;
  const path = fileUrl.slice(idx);

  const signature = await crmFileSignature(path);
  if (signature.url) return signature.url;
  if (!signature.streamable) return null;

  try {
    const fileResponse = await fetch(`${API_BASE_URL}${path}`, { headers: getAiAuthHeaders() });
    if (!fileResponse.ok) {
      if (shouldHandleAuthExpired(path, fileResponse.status)) handleAuthExpired();
      return null;
    }
    return URL.createObjectURL(await fileResponse.blob());
  } catch {
    return null;
  }
}

export async function downloadCrmFile(
  fileUrl?: string | null,
  fileName?: string,
  startupId?: string | null,
): Promise<void> {
  fileUrl = normalizeCrmFileUrl(fileUrl, startupId);
  if (!fileUrl) return;
  const idx = fileUrl.indexOf('/crm/files/');
  if (idx === -1) {
    const safeUrl = safeExternalHref(fileUrl);
    if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const path = fileUrl.slice(idx);
  try {
    const separator = path.includes('?') ? '&' : '?';
    const nameParam = fileName?.trim()
      ? `&name=${encodeURIComponent(fileName.trim())}`
      : '';
    const access = await fetchApi<{ url?: string | null; streamUrl?: string | null }>(
      `${path}${separator}json=1&download=1${nameParam}`,
    );
    const signedUrl = safeExternalHref(access.success ? access.data?.url : null);
    if (signedUrl) {
      const anchor = document.createElement('a');
      anchor.href = signedUrl;
      anchor.download = fileName || fileNameFromUrl(fileUrl, 'document');
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    const streamUrl = access.success ? access.data?.streamUrl : null;
    const streamIndex = streamUrl?.indexOf('/crm/files/') ?? -1;
    if (streamIndex === -1) {
      throw new Error(access.error || 'Failed to resolve CRM file download URL');
    }
    const streamPath = streamUrl!.slice(streamIndex);
    const response = await fetch(`${API_BASE_URL}${streamPath}`, { headers: getAiAuthHeaders() });
    if (!response.ok) {
      if (shouldHandleAuthExpired(streamPath, response.status)) handleAuthExpired();
      throw new Error(`Failed to download CRM file: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName || fileNameFromUrl(fileUrl, 'document');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    console.error('Failed to download CRM file:', error);
  }
}

export interface News {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source: string;
  sourceUrl?: string;
  externalUrl?: string;
  imageUrl: string;
  tags: string[];
  publishedAt: string | Date;
  isPublished?: boolean;
  isExternal?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const newsApi = {
  getAll: async (limit?: number): Promise<ApiResponse<News[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return fetchApi<News[]>(`/crm/news${params}`);
  },

  getById: async (id: string): Promise<ApiResponse<News>> => {
    return fetchApi<News>(`/crm/news/${id}`);
  },

  create: async (news: Omit<News, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<News>> => {
    return fetchApi<News>('/crm/news', {
      method: 'POST',
      body: JSON.stringify(news),
    });
  },

  update: async (id: string, news: Partial<News>): Promise<ApiResponse<News>> => {
    return fetchApi<News>(`/crm/news/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(news),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/news/${id}`, {
      method: 'DELETE',
    });
  },
};

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
  generatedAt?: string | Date;
  generatedBy?: string | null;
  generatedByName?: string | null;
  storagePath?: string;
  url?: string;
  fileName?: string;
  docxStoragePath?: string;
  docxUrl?: string;
  docxFileName?: string;
  htmlStoragePath?: string;
  htmlUrl?: string;
  htmlFileName?: string;
  error?: string;
}

export interface GenerateInvestmentMemoPayload {
  managerId?: string;
  managerName?: string;
  language?: InvestmentMemoLanguage;
  force?: boolean;
  includeVisuals?: boolean;
}

export interface GenerateInvestmentMemoResult {
  startup: Startup;
  investmentMemo: InvestmentMemoSummary;
}

export interface RequestSmartValResult {
  startup: Startup;
  emailSent: boolean;
  founderEmail: string;
  requestedAt: string;
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
  updatedAt?: string | Date;
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
    preparedAt?: string | Date;
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
      generatedAt?: string | Date;
      generatedBy?: string | null;
      generatedByName?: string | null;
    };
  };
  signatures?: {
    requiredCount?: number;
    sharedProtocol?: InvestmentCommitteeFileRef;
    members?: Array<{
      id: string;
      managerId?: string;
      name?: string;
      role?: string;
      status?: InvestmentCommitteeSignatureStatus;
      signatureType?: string;
      isRemote?: boolean;
      scanUrl?: string;
      originalStatus?: string;
      signedAt?: string | Date;
      signedDocumentUrl?: string;
      signedDocumentFileName?: string;
      signedDocuments?: Array<{
        id?: string;
        fileName?: string;
        url?: string;
        storagePath?: string;
        contentType?: string;
        size?: number;
        uploadedAt?: string | Date;
        uploadedBy?: string | null;
        uploadedByName?: string | null;
        documentType?: string;
      }>;
      comment?: string;
      eSignatureRequestId?: string;
      eSignatureCertificateUrl?: string;
    }>;
    remoteSignature?: {
      enabled?: boolean;
      memberId?: string;
      memberName?: string;
      scanReceived?: boolean;
      scanReceivedAt?: string | Date;
      scanUrl?: string;
      originalStatus?: string;
      originalReceivedAt?: string | Date;
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
      eSignatureExpiresAt?: string | Date;
      eSignedAt?: string | Date;
      eSignatureCertificateUrl?: string;
      eSignatureIp?: string;
      eSignatureUserAgent?: string;
      eSignatureConsentText?: string;
      consentText?: string;
      signedProtocolFiles?: Array<{
        id?: string;
        fileName?: string;
        url?: string;
        storagePath?: string;
        contentType?: string;
        size?: number;
        uploadedAt?: string | Date;
        uploadedBy?: string | null;
        uploadedByName?: string | null;
        memberId?: string;
        documentType?: string;
      }>;
      remoteSigningRequests?: Array<{
        id?: string;
        requestId?: string;
        memberId?: string;
        memberName?: string;
        signerEmail?: string;
        status?: string;
        expiresAt?: string | Date;
        createdAt?: string | Date;
        signedAt?: string | Date;
        certificateUrl?: string;
      }>;
      legalNote?: string;
    };
  };
  history?: Array<Record<string, unknown>>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  updatedBy?: string | null;
  updatedByName?: string | null;
}

export interface InvestmentCommitteeResult {
  startup: Startup;
  investmentCommittee: InvestmentCommitteeWorkflow;
  protocol?: NonNullable<NonNullable<InvestmentCommitteeWorkflow['protocol']>['latestExport']>;
}

export interface InvestmentCommitteeProject {
  startupId?: string;
  startupName?: string;
  status?: string;
  logoUrl?: string;
  industry?: string;
  stage?: string;
  terms?: Record<string, unknown>;
  conditions?: string[];
  presentationUrl?: string;
  investmentMemoUrl?: string;
  documents?: Array<{
    id?: string;
    title?: string;
    category?: string;
    source?: string;
    status?: string;
    url?: string;
  }>;
  decision?: InvestmentCommitteeDecision | string;
  presenterName?: string;
  managerThesis?: string;
  memberVotes?: InvestmentCommitteeMemberVote[];
  chairDecision?: InvestmentCommitteeChairDecision;
  notes?: string;
  resolution?: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
}

export interface InvestmentCommitteeMemberVote {
  memberId?: string;
  memberName?: string;
  vote?: 'for' | 'against';
  comment?: string;
  votedAt?: string;
}

export interface InvestmentCommitteeChairDecision {
  chairId?: string;
  chairName?: string;
  decision?: 'approve' | 'reject';
  comment?: string;
  decidedAt?: string;
}

export interface InvestmentCommitteeAgendaItem {
  id?: string;
  title?: string;
  note?: string;
  addedBy?: string;
  addedByName?: string;
}

export interface InvestmentCommitteeComment {
  id?: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  text?: string;
  createdAt?: string;
}

export type InvestmentCommitteeApprovalStepStatus = 'pending' | 'approved' | 'changes_requested' | 'signed' | string;

export interface InvestmentCommitteeApprovalStepState {
  status?: InvestmentCommitteeApprovalStepStatus;
  managerId?: string;
  managerName?: string;
  comment?: string;
  decidedAt?: string;
  pendingDocument?: InvestmentCommitteeFileRef;
  signedDocument?: InvestmentCommitteeFileRef;
}

export interface InvestmentCommitteeApprovalFlow {
  lawyer?: InvestmentCommitteeApprovalStepState;
  deputy?: InvestmentCommitteeApprovalStepState;
  director?: InvestmentCommitteeApprovalStepState;
  sentToCommitteeAt?: string;
}

export type InvestmentCommitteeStage =
  | 'draft'
  | 'shortlist_signing'
  | 'voting'
  | 'legal_review'
  | 'deputy_review'
  | 'director_review'
  | 'signing'
  | 'completed'
  | 'cancelled';

export type DataRoomBlockerReasonCode =
  | 'missing_data_room_url'
  | 'invalid_data_room_url'
  | 'startup_not_found';

export interface DataRoomBlocker {
  startupId: string;
  startupName: string;
  reasonCode: DataRoomBlockerReasonCode;
  message: string;
  managerReason?: string;
}

export interface DataRoomRequiredErrorData {
  blockedTransition?: {
    from: string;
    to: string;
  };
  meetingUpdatedAt: string;
  blockers: DataRoomBlocker[];
}

export interface DataRoomRequiredError {
  success: false;
  error: 'data_room_required';
  message?: string;
  data: DataRoomRequiredErrorData;
}

export type DataRoomGateApiResponse<T> = ApiResponse<T> | DataRoomRequiredError;

export interface InvestmentCommitteeShortlistPatch {
  title?: string;
  meetingDate?: string;
  startupIds: string[];
  protocol: {
    presentedProjects: InvestmentCommitteeProject[];
  };
}

export interface DataRoomBlockerReasonInput {
  startupId: string;
  reason: string;
}

export interface InvestmentCommitteeFileRef {
  id?: string;
  fileName?: string;
  url?: string;
  storagePath?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string | Date;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  sourceExportId?: string;
}

export interface InvestmentCommitteeShortlist {
  status?: 'draft' | 'generated' | 'pending_review' | 'changes_requested' | 'signed';
  latestExport?: {
    id?: string;
    fileName?: string;
    htmlUrl?: string;
    generatedAt?: string | Date;
    generatedByName?: string | null;
  };
  pendingDocument?: InvestmentCommitteeFileRef;
  signedDocument?: InvestmentCommitteeFileRef;
  finalizedAt?: string;
  finalizedByName?: string;
  signedAt?: string;
  signedByName?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewComment?: string;
  amountsConfirmedExportId?: string;
  amountsConfirmedAt?: string;
  amountsConfirmedBy?: string;
  amountsConfirmedByName?: string;
}

export interface InvestmentCommitteeSnapshotMember {
  managerId: string;
  name?: string;
  email?: string;
  isRemote?: boolean;
  committeeRole?: 'member' | 'chair';
}

export interface InvestmentCommitteeCommitteeSnapshot {
  capturedAt?: string;
  selectionLocked?: boolean;
  requiredCount?: number;
  chairId?: string;
  members?: InvestmentCommitteeSnapshotMember[];
}

export interface InvestmentCommitteeLegalReview {
  status?: 'pending' | 'submitted' | 'changes_requested';
  conclusion?: string;
  managerId?: string;
  managerName?: string;
  submittedAt?: string;
  lastReturnComment?: string;
  signedDocument?: InvestmentCommitteeFileRef;
}

export interface InvestmentCommitteeReturnEntry {
  id?: string;
  fromStage?: string;
  toStage?: string;
  byStep?: 'deputy' | 'director' | string;
  managerId?: string;
  managerName?: string;
  comment?: string;
  createdAt?: string;
}

export interface InvestmentCommitteeDossier {
  startupId: string;
  name: string;
  dataRoomUrl?: string;
  logoUrl?: string;
  industry?: string;
  stage?: string;
  country?: string;
  website?: string;
  description?: string;
  status?: string;
  fileUrls?: {
    pitchDeck?: string;
    onePager?: string;
    financialModel?: string;
  };
  documents?: Array<{
    id?: string;
    fileName?: string;
    url?: string;
    category?: string;
  }>;
  investmentMemo?: {
    title?: string;
    docxUrl?: string;
    htmlUrl?: string;
    url?: string;
    decision?: string;
    generatedAt?: string | Date;
  };
  fundGateScore?: number;
  aiAnalysis?: {
    recommendation?: string;
    strengths?: string[];
    weaknesses?: string[];
    marketAnalysis?: string;
    teamAnalysis?: string;
    productAnalysis?: string;
    financialAnalysis?: string;
  };
  smartVal?: {
    valuation?: number;
    valuation_low?: number;
    valuation_high?: number;
    method?: string;
    confidence?: number;
    recommendations?: string[];
    breakdown?: Array<{ key?: string; score?: number; comment?: string }>;
  };
  managerThesis?: string;
  missing?: boolean;
  assignedManager?: { id?: string; name?: string; avatar?: string };
  assignedManagerId?: string;
  assignedManagerName?: string;
  presentationUrl?: string;
  meetingMemoUrl?: string;
  terms?: Record<string, unknown>;
  decision?: string;
  resolution?: string;
  conditions?: string[];
}

export interface InvestmentCommittee {
  id: string;
  organizationId: string;
  title: string;
  status: InvestmentCommitteeWorkflowStatus;
  stage?: InvestmentCommitteeStage;
  stageChangedAt?: string;
  shortlist?: InvestmentCommitteeShortlist;
  committee?: InvestmentCommitteeCommitteeSnapshot;
  legalReview?: InvestmentCommitteeLegalReview;
  returns?: InvestmentCommitteeReturnEntry[];
  votingCompletedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledByName?: string;
  cancelReason?: string;
  meetingDate?: string;
  protocolNumber?: string;
    preliminaryAnalysis?: {
      financeStatus?: InvestmentCommitteeTrackStatus;
      financeManagerName?: string;
      financeConclusion?: string;
    technicalStatus?: InvestmentCommitteeTrackStatus;
    technicalManagerName?: string;
    technicalConclusion?: string;
    anastasiaDiscussion?: {
      status?: InvestmentCommitteeTrackStatus;
      participantName?: string;
      notes?: string;
      discussedAt?: string;
      };
      retainedProjectCount?: number;
      notes?: string;
      attachments?: Record<string, Array<{
        id?: string;
        fileName?: string;
        url?: string;
        storagePath?: string;
        contentType?: string;
        size?: number;
        section?: string;
        documentType?: string;
        uploadedAt?: string | Date;
        uploadedBy?: string | null;
        uploadedByName?: string | null;
      }>>;
    };
  documentationPackage?: {
    status?: InvestmentCommitteeTrackStatus;
    folderPath?: string;
    preparedBy?: string | null;
    preparedByName?: string | null;
    projectFolders?: Array<{
      startupId?: string;
      startupName?: string;
      folderPath?: string;
      documents?: InvestmentCommitteeProject['documents'];
    }>;
    note?: string;
  };
  protocol?: {
    status?: InvestmentCommitteeProtocolStatus;
    protocolNumber?: string;
    meetingDate?: string;
    presentedProjects?: InvestmentCommitteeProject[];
    voting?: {
      for?: number;
      against?: number;
      abstain?: number;
      totalMembers?: number;
      quorumRequired?: number;
      result?: InvestmentCommitteeDecision | string;
      phase?: 'members' | 'chair' | 'closed';
      membersCompletedAt?: string;
    };
    conditions?: string[];
    adjustments?: string;
    defenseNotes?: string;
    committeeChanges?: string[];
    agendaItems?: InvestmentCommitteeAgendaItem[];
    lawyerConclusion?: string;
    latestExport?: NonNullable<NonNullable<InvestmentCommitteeWorkflow['protocol']>['latestExport']>;
    signedProtocol?: {
      id?: string;
      fileName?: string;
      url?: string;
      contentType?: string;
      uploadedAt?: string;
      uploadedBy?: string | null;
      uploadedByName?: string | null;
    };
  };
  signatures?: InvestmentCommitteeWorkflow['signatures'];
  approvalFlow?: InvestmentCommitteeApprovalFlow;
  comments?: InvestmentCommitteeComment[];
  history?: Array<Record<string, unknown>>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  updatedBy?: string | null;
  updatedByName?: string | null;
}

export interface InvestmentCommitteeMeetingResult {
  meeting: InvestmentCommittee;
  protocol?: NonNullable<NonNullable<InvestmentCommittee['protocol']>['latestExport']>;
}

export type InvestmentCommitteeMeetingProject = InvestmentCommitteeProject;
export type InvestmentCommitteeMeetingComment = InvestmentCommitteeComment;
export type InvestmentCommitteeMeetingStage = InvestmentCommitteeStage;
export type InvestmentCommitteeMeeting = InvestmentCommittee;

export interface InvestmentCommitteeRemoteSignaturePublicView {
  requestId: string;
  status: 'pending' | 'signed' | 'expired' | 'revoked' | string;
  expiresAt?: string | Date;
  signedAt?: string | Date;
  signerName?: string;
  signerEmail?: string;
  member?: {
    id?: string;
    name?: string;
    role?: string;
  };
  meeting?: {
    id?: string;
    title?: string;
    protocolNumber?: string;
    meetingDate?: string;
    latestExportHtmlUrl?: string;
    presentedProjects?: InvestmentCommitteeProject[];
    voting?: Record<string, unknown>;
    conditions?: string[];
    adjustments?: string;
    committeeChanges?: string[];
  };
  consentText?: string;
  legalNote?: string;
  bundleNote?: string;
  certificateUrl?: string;
}

export interface InvestmentCommitteeRemoteSignatureRequestResult {
  meeting: InvestmentCommittee;
  request: InvestmentCommitteeRemoteSignaturePublicView;
  signUrl: string;
  expiresAt: string;
}

export interface Startup {
  id: string;
  organizationId: string;
  platformIdentityKey?: string;
  dataRoomUrl?: string;
  dataRoomApprovedUrl?: string;
  dataRoomStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  dataRoomReviewNote?: string;
  brief: {
    name?: string;
    industry?: string;
    description?: string;
    [key: string]: unknown;
  };
  status: string;
  boardColumnId?: string;
  source: string;
  rejectionReason?: string;
  assignedManagerId?: string | null;
  assignedManager?: { id?: string; name?: string; avatar?: string };
  fundConsiderationAmount?: number;
  portfolioType?: 'investment' | 'program';
  portfolioSegment?: PortfolioSegmentKey | null;
  comments?: unknown[];
  activityLog?: unknown[];
  aiAnalysis?: {
    score?: number;
    valuation?: number;
    [key: string]: unknown;
  };
  analysisStatus?: 'queued' | 'processing' | 'completed' | 'failed';
  analysisError?: string;
  investmentMemo?: InvestmentMemoSummary;
  investmentMemoStatus?: InvestmentMemoStatus;
  investmentMemoGeneratedAt?: string | Date;
  investmentCommittee?: InvestmentCommitteeWorkflow;
  investmentCommitteeStatus?: InvestmentCommitteeWorkflowStatus;
  sentToCommittee?: { at?: string; by?: string; byName?: string };
  documentRequests?: DocumentRequest[];
  roadmap?: StartupRoadmap;
  crossFundApplications?: CrossFundApplication[];
  ddReviews?: DDReviewSet;
  portfolioWorkbookEdits?: {
    capTable?: Record<string, Record<string, string | number | null>>;
  };
  completionPercent?: number;
  pendingChangeCount?: number;
  lastQuarterlyReportAt?: string | Date;
  lastQuarterlyReportReviewedAt?: string | Date;
  lastQuarterlyReportId?: string;
  lastQuarterlyReportPeriod?: { year: number; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' };
  lastQuarterlyReportRequestId?: string;
  lastQuarterlyReportStatus?: 'requested' | 'submitted' | 'in_review' | 'approved' | 'changes_requested' | 'cancelled';
  quarterlyReportsCount?: number;
  resubmissionCount?: number;
  finallyBlocked?: boolean;
  finallyBlockedAt?: string | Date;
  finallyBlockedBy?: string;
  finallyBlockReason?: string;
  isArchived?: boolean;
  archivedAt?: string | Date;
  archivedBy?: string;
  previousVersions?: StartupPreviousVersion[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  uploadedAt: string | Date;
  uploadedBy: 'founder' | 'manager';
  uploadedByName?: string;
  country?: string;
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
  updatedAt?: string | Date;
}

export type DDReviewSet = Partial<Record<DDReviewTrackKey, DDReviewTrack>>;

export interface PendingChangeSet {
  id: string;
  startupId: string;
  founderEmail?: string;
  changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> | Record<string, unknown>;
  patch?: Record<string, unknown>;
  fieldChanges?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  status: 'pending' | 'manager_approved' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string | Date;
  reviewNote?: string;
  managerReviewedBy?: string;
  managerReviewedByName?: string;
  managerReviewedAt?: string | Date;
  directorReviewedBy?: string;
  directorReviewedByName?: string;
  directorReviewedAt?: string | Date;
  directorReviewNote?: string;
  createdAt?: string | Date;
}

export interface ImportItem {
  id: string;
  batchId: string;
  index: number;
  status: 'draft' | 'matched' | 'applied' | 'skipped';
  organizationId?: string | null;
  sheetName?: string;
  rowNumber?: number;
  startupName?: string | null;
  mappedType?: string;
  mapped?: Record<string, unknown>;
  source?: Record<string, unknown>;
  suggestedAction?: 'update' | 'create' | 'skip';
  analysisMatch?: PortfolioImportStartupMatch;
  analysisPreview?: PortfolioImportPreviewRow;
  approvedAction?: 'update' | 'create' | 'skip';
  appliedStartupId?: string;
  approvedPatch?: PortfolioStartupPatch;
  applyError?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ImportBatch {
  id: string;
  batchId?: string;
  type: 'itpark_portfolio' | string;
  fileName: string;
  sheetNames?: string[];
  status: 'draft' | 'reviewed' | 'applied' | 'cancelled' | string;
  organizationId?: string | null;
  analysisStatus?: 'not_started' | 'processing' | 'completed' | 'failed' | string;
  analysis?: PortfolioImportAnalysis;
  analysisError?: string | null;
  analysisModel?: string;
  applySummary?: PortfolioImportApplySummary;
  assistantChatId?: string;
  itemCount: number;
  createdBy?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  items?: ImportItem[];
}

export interface PortfolioImportFieldMapping {
  sourceSheet?: string | null;
  sourceColumn: string;
  targetField: string;
  confidence: number;
  reason?: string | null;
  sampleValues?: Array<string | number | boolean | null>;
}

export interface PortfolioImportStartupMatch {
  itemId: string;
  index: number;
  startupName?: string | null;
  matchedStartupId?: string | null;
  matchedStartupName?: string | null;
  confidence: number;
  status: 'matched' | 'needs_review' | 'new';
  reason?: string | null;
}

export interface PortfolioStartupPatch {
  brief?: {
    companyName?: string;
    website?: string;
    country?: string;
    industry?: string;
    stage?: string;
    description?: string;
  };
  portfolioType?: 'investment' | 'program';
  investmentAmount?: number;
  valuation?: number;
  valuationType?: 'pre-money' | 'post-money';
  portfolioResponsiblePerson?: string;
  metrics?: {
    reportDate?: string;
    arr?: number;
    mrr?: number;
    cogs?: number;
    gmv?: number;
    arpu?: number;
    ltv?: number;
    cac?: number;
    grossMargin?: number;
    burnRate?: number;
    churnRate?: number;
    runway?: number;
    yoyGrowth?: number;
    qoqGrowth?: number;
    momGrowth?: number;
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
  };
}

export interface PortfolioImportFieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface PortfolioImportPreviewRow {
  itemId: string;
  index: number;
  sheetName?: string | null;
  rowNumber?: number | null;
  startupName?: string | null;
  action: 'update' | 'create' | 'skip';
  match: PortfolioImportStartupMatch;
  patch: PortfolioStartupPatch;
  changes?: PortfolioImportFieldChange[];
  changeCount?: number;
  display: {
    companyName?: string;
    country?: string;
    industry?: string;
    stage?: string;
    investmentAmount?: number;
    valuation?: number;
    arr?: number;
    mrr?: number;
    cogs?: number;
    gmv?: number;
    arpu?: number;
    grossMargin?: number;
    burnRate?: number;
    churnRate?: number;
    runway?: number;
    yoyGrowth?: number;
    qoqGrowth?: number;
    momGrowth?: number;
    ebitdaMargin?: number;
    currentRatio?: number;
    ebitda?: number;
    payingCustomers?: number;
    netProfit?: number;
    netMargin?: number;
    cashAtBank?: number;
    totalDebt?: number;
    debtToEquity?: number;
    responsiblePerson?: string;
    sourceDate?: string;
  };
}

export interface PortfolioImportAnalysis {
  model: string;
  generatedAt: string;
  confidence: number;
  fieldMappings: PortfolioImportFieldMapping[];
  startupMatches: PortfolioImportStartupMatch[];
  portfolioPreview: PortfolioImportPreviewRow[];
  warnings: string[];
  unmappedColumns: string[];
}

export interface PortfolioImportApplyDecision {
  itemId: string;
  action: 'update' | 'create' | 'skip';
  startupId?: string | null;
  patch?: PortfolioStartupPatch;
}

export interface PortfolioImportApplySummary {
  total: number;
  updated: number;
  created: number;
  skipped: number;
  failed: number;
  errors?: Array<{ itemId?: string; message: string }>;
}

export interface AIArtifactPayload {
  type: 'report' | 'portfolio-analysis' | 'startup-analysis' | 'tasks' | 'portfolio-import-review';
  title: string;
  data: unknown;
}

export type DocumentInputType = 'file' | 'url';
export type DocumentCategory = 'presentation' | 'legal' | 'financial' | 'traction' | 'investment' | 'other';

export interface DocumentRequestItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  status: DocumentItemStatus;
  requestedAt?: string | Date;
  dueDate?: string | null;
  files?: StartupDocumentFile[];
  reviewNote?: string;
  reviewedAt?: string | Date;
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
  createdAt: string | Date;
  updatedAt: string | Date;
  remindedAt?: string | Date;
  items: DocumentRequestItem[];
}

export interface DocumentRequestReminderResult {
  requestId: string;
  remindedAt: string;
  request?: DocumentRequest;
  emailSent: boolean;
  emailSkippedReason?: 'founder_email_missing' | 'email_not_sent' | string;
  chatSent: boolean;
  chatMessageId?: string;
  chatMessage?: unknown;
  chatSkippedReason?: string;
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
  id: StartupRoadmapStepId;
  status: StartupRoadmapStepStatus;
  owner?: string;
  dueDate?: string;
  note?: string;
  completedAt?: string | Date;
  decision?: StartupRoadmapDecision;
  updatedAt?: string | Date;
}

export interface StartupRoadmap {
  steps: Partial<Record<StartupRoadmapStepId, StartupRoadmapStep>>;
  updatedAt?: string | Date;
}

export interface DocumentRequestTemplate {
  id: string;
  title: string;
  items: Array<Pick<DocumentRequestItem, 'id' | 'title' | 'description' | 'required' | 'category' | 'inputType' | 'acceptedFormats' | 'requiresCountry'>>;
}

export interface StartupPreviousVersion {
  versionAt: string | Date;
  rejectionReason?: string;
  status?: string;
  brief?: Record<string, unknown>;
  formData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PortfolioCellUpdatePayload {
  section: 'dashboard' | 'cap_table' | 'traction';
  field: string;
  value: string | number | null;
  rowId?: string;
  rowKind?: 'founder' | 'fund' | 'investment';
  metricId?: string;
  month?: string;
  rollback?: { activityId: string; field: string };
}

export type StartupMaterialField = 'pitchDeck' | 'onePager' | 'financialModel' | 'logo';

export type InteractionType = 'contacted' | 'meeting' | 'documents';

export interface StartupInteraction {
  id: string;
  organizationId: string;
  startupId: string;
  startupName: string;
  managerId: string;
  managerName: string;
  branch?: string;
  type: InteractionType;
  note?: string;
  occurredAt: string | Date | { _seconds: number; _nanoseconds: number };
  createdAt?: string | Date | { _seconds: number; _nanoseconds: number };
  createdBy?: string;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submission_id: string;
  email: string;
}

export const startupsApi = {
  getInteractions: async (id: string): Promise<ApiResponse<StartupInteraction[]>> => {
    return fetchApi<StartupInteraction[]>(`/crm/startups/${id}/interactions`);
  },

  addInteraction: async (
    id: string,
    data: { type: InteractionType; note?: string; occurredAt?: string; managerId?: string; managerName?: string }
  ): Promise<ApiResponse<StartupInteraction>> => {
    return fetchApi<StartupInteraction>(`/crm/startups/${id}/interactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  autofillPitchDeck: async (file: File): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('pitchDeck', file);
    const response = await fetch(`${API_BASE_URL}/crm/autofill/pitch-deck`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (shouldHandleAuthExpired('/crm/autofill/pitch-deck', response.status)) {
        handleAuthExpired();
      }
      const err = new Error(
        (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        `Autofill failed (${response.status})`
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return data as Record<string, unknown>;
  },

  submitStartup: async (
    application: Record<string, unknown>,
    locale: string,
    pitchDeck: File,
    logo?: File,
    onePager?: File,
    financialModel?: File,
  ): Promise<SubmissionResponse> => {
    const formData = new FormData();
    formData.append('application', JSON.stringify(application));
    formData.append('locale', locale);
    formData.append('pitchDeck', pitchDeck);
    if (logo) formData.append('logo', logo);
    if (onePager) formData.append('onePager', onePager);
    if (financialModel) formData.append('financialModel', financialModel);
    const response = await fetch(`${API_BASE_URL}/crm/startups/submit`, {
      method: 'POST',
      headers: getAiAuthHeaders(),
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (shouldHandleAuthExpired('/crm/startups/submit', response.status)) {
        handleAuthExpired();
      }
      const detail = (data as { message?: string; error?: string }).message
        || (data as { error?: string }).error || '';
      const err = new Error(`Submission failed (${response.status})${detail ? ` — ${detail}` : ''}`) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return data as SubmissionResponse;
  },

  getAll: async (organizationId: string, limit = 1000): Promise<ApiResponse<Startup[]>> => {
    const params = new URLSearchParams({
      organizationId,
      limit: String(limit),
    });
    return fetchApi<Startup[]>(`/crm/startups?${params.toString()}`);
  },

  getById: async (id: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}`);
  },

  create: async (startup: Partial<Startup>): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>('/crm/startups', {
      method: 'POST',
      body: JSON.stringify(startup),
    });
  },

  update: async (id: string, data: Partial<Startup>): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  selfAssign: async (id: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/self-assignment`, {
      method: 'POST',
    });
  },

  updateDataRoomUrl: async (id: string, dataRoomUrl: string | null): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/data-room`, {
      method: 'PATCH',
      body: JSON.stringify({ dataRoomUrl }),
    });
  },

  submitDataRoom: async (id: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/data-room/submit`, { method: 'POST' });
  },

  reviewDataRoom: async (
    id: string,
    action: 'approve' | 'reject',
    note?: string,
  ): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/data-room/review`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },

  updatePortfolioCell: async (id: string, data: PortfolioCellUpdatePayload): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/portfolio-cell`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateDDReviewTrack: async (
    id: string,
    trackKey: DDReviewTrackKey,
    data: DDReviewTrack & { managerId?: string; managerName?: string }
  ): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/dd-reviews/${trackKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  runFundGateScore: async (id: string, managerId?: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/fundgate-score`, {
      method: 'POST',
      headers: managerId ? { 'x-manager-id': managerId } : undefined,
      body: JSON.stringify({ managerId }),
    });
  },

  generateInvestmentMemo: async (
    id: string,
    payload: GenerateInvestmentMemoPayload = {}
  ): Promise<ApiResponse<GenerateInvestmentMemoResult>> => {
    return fetchApi<GenerateInvestmentMemoResult>(`/crm/startups/${id}/investment-memo`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  requestSmartVal: async (
    id: string,
    payload: { managerId?: string; managerName?: string; language?: InvestmentMemoLanguage | 'uz'; message?: string } = {}
  ): Promise<ApiResponse<RequestSmartValResult>> => {
    return fetchApi<RequestSmartValResult>(`/crm/startups/${id}/smartval-request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInvestmentCommittee: async (id: string): Promise<ApiResponse<InvestmentCommitteeWorkflow | null>> => {
    return fetchApi<InvestmentCommitteeWorkflow | null>(`/crm/startups/${id}/investment-committee`);
  },

  prepareInvestmentCommittee: async (
    id: string,
    payload: { managerId?: string; managerName?: string } = {}
  ): Promise<ApiResponse<InvestmentCommitteeResult>> => {
    return fetchApi<InvestmentCommitteeResult>(`/crm/startups/${id}/investment-committee/prepare`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateInvestmentCommittee: async (
    id: string,
    workflow: Partial<InvestmentCommitteeWorkflow> & { managerId?: string; managerName?: string }
  ): Promise<ApiResponse<InvestmentCommitteeResult>> => {
    return fetchApi<InvestmentCommitteeResult>(`/crm/startups/${id}/investment-committee`, {
      method: 'PATCH',
      body: JSON.stringify(workflow),
    });
  },

  updateInvestmentCommitteeSignature: async (
    id: string,
    memberId: string,
    payload: {
      status?: InvestmentCommitteeSignatureStatus;
      signatureType?: string;
      comment?: string;
      scanUrl?: string;
      originalStatus?: string;
      managerId?: string;
      managerName?: string;
    }
  ): Promise<ApiResponse<InvestmentCommitteeResult>> => {
    return fetchApi<InvestmentCommitteeResult>(`/crm/startups/${id}/investment-committee/signatures/${memberId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  exportInvestmentCommitteeProtocol: async (
    id: string,
    payload: { workflow?: Partial<InvestmentCommitteeWorkflow>; managerId?: string; managerName?: string } = {}
  ): Promise<ApiResponse<InvestmentCommitteeResult>> => {
    return fetchApi<InvestmentCommitteeResult>(`/crm/startups/${id}/investment-committee/protocol/export`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  sendToCommittee: async (id: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/send-to-committee`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  addComment: async (
    id: string,
    comment: { managerId?: string; managerName?: string; managerAvatar?: string; text: string; isInternal?: boolean }
  ): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/crm/startups/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  },

  editComment: async (
    startupId: string,
    commentId: string,
    text: string
  ): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/crm/startups/${startupId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
  },

  deleteComment: async (
    startupId: string,
    commentId: string
  ): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/crm/startups/${startupId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  markCommentsSeen: async (
    startupId: string,
    seenAt?: string,
  ): Promise<ApiResponse<{ startupId: string; seenAt: string }>> => {
    return fetchApi<{ startupId: string; seenAt: string }>(
      `/crm/managers/me/comments-seen`,
      {
        method: 'PATCH',
        body: JSON.stringify({ startupId, seenAt: seenAt ?? new Date().toISOString() }),
      },
    );
  },

  getActivity: async (id: string): Promise<ApiResponse<ActivityLogEntry[]>> => {
    return fetchApi<ActivityLogEntry[]>(`/crm/startups/${id}/activity`);
  },

  addActivity: async (
    id: string,
    activity: Partial<ActivityLogEntry>
  ): Promise<ApiResponse<ActivityLogEntry>> => {
    return fetchApi<ActivityLogEntry>(`/crm/startups/${id}/activity`, {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/startups/${id}`, {
      method: 'DELETE',
    });
  },

  permanentlyDeleteArchived: async (id: string): Promise<ApiResponse<{ startupId: string; relatedDeleted: Record<string, number> }>> => {
    return fetchApi<{ startupId: string; relatedDeleted: Record<string, number> }>(`/crm/startups/${id}/archive/permanent`, {
      method: 'DELETE',
    });
  },

  archive: async (id: string, managerId?: string, managerName?: string, rejectionReason?: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/startups/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ managerId, managerName, rejectionReason }),
    });
  },

  restore: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/startups/${id}/restore`, {
      method: 'POST',
    });
  },

  finallyBlock: async (id: string, reason?: string, managerId?: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/finally-block`, {
      method: 'PATCH',
      headers: managerId ? { 'x-manager-id': managerId } : undefined,
      body: JSON.stringify({ reason, managerId }),
    });
  },

  uploadDocument: async (
    id: string,
    fileBase64: string,
    fileName: string,
    contentType: string,
    options?: { requestId?: string; itemId?: string; uploadedBy?: 'founder' | 'manager'; uploadedByName?: string }
  ): Promise<ApiResponse<StartupDocumentFile>> => {
    return fetchApi<StartupDocumentFile>(`/crm/startups/${id}/documents/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileBase64, fileName, contentType, ...options }),
    });
  },

  uploadPitchDeck: async (
    id: string,
    fileBase64: string,
    fileName: string,
    contentType: string,
    options?: { managerId?: string; uploadedByName?: string }
  ): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/pitch-deck/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileBase64, fileName, contentType, ...options }),
    });
  },

  uploadMaterial: async (
    id: string,
    field: StartupMaterialField,
    fileBase64: string,
    fileName: string,
    contentType: string,
    options?: { managerId?: string; uploadedByName?: string }
  ): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/materials/upload`, {
      method: 'POST',
      body: JSON.stringify({ field, fileBase64, fileName, contentType, ...options }),
    });
  },

  getDocumentRequestTemplates: async (): Promise<ApiResponse<DocumentRequestTemplate[]>> => {
    return fetchApi<DocumentRequestTemplate[]>('/crm/document-request-templates');
  },

  getDocumentRequests: async (id: string): Promise<ApiResponse<DocumentRequest[]>> => {
    return fetchApi<DocumentRequest[]>(`/crm/startups/${id}/document-requests`);
  },

  createDocumentRequest: async (
    id: string,
    payload: {
      templateId?: string;
      title?: string;
      message?: string;
      dueDate?: string;
      managerId?: string;
      managerName?: string;
      locale?: string;
      items: Array<Pick<DocumentRequestItem, 'id' | 'title' | 'description' | 'required' | 'category' | 'inputType' | 'acceptedFormats' | 'requiresCountry'>>;
    }
  ): Promise<ApiResponse<DocumentRequest>> => {
    return fetchApi<DocumentRequest>(`/crm/startups/${id}/document-requests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  reviewDocumentRequestItem: async (
    startupId: string,
    requestId: string,
    itemId: string,
    payload: {
      status: DocumentItemStatus;
      reviewNote?: string;
      managerId?: string;
      managerName?: string;
      locale?: string;
    }
  ): Promise<ApiResponse<DocumentRequest>> => {
    return fetchApi<DocumentRequest>(`/crm/startups/${startupId}/document-requests/${requestId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remindDocumentRequest: async (
    startupId: string,
    requestId: string,
    payload: { managerId?: string; managerName?: string; message?: string; locale?: string }
  ): Promise<ApiResponse<DocumentRequestReminderResult>> => {
    return fetchApi<DocumentRequestReminderResult>(`/crm/startups/${startupId}/document-requests/${requestId}/remind`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getArchived: async (organizationId: string): Promise<ApiResponse<Startup[]>> => {
    return fetchApi<Startup[]>(`/crm/startups/archived?organizationId=${organizationId}`);
  },

  getFundGateAvailable: async (organizationId: string): Promise<ApiResponse<FundGateStartup[]>> => {
    return fetchApi<FundGateStartup[]>(`/crm/fundgate/available?organizationId=${organizationId}`);
  },

  importFundGateStartup: async (fundGateId: string, organizationId: string, managerId?: string): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/fundgate/import/${fundGateId}`, {
      method: 'POST',
      body: JSON.stringify({ organizationId, managerId }),
    });
  },

  importAllFundGate: async (organizationId: string, managerId?: string): Promise<ApiResponse<{ imported: number; ids: string[] }>> => {
    return fetchApi<{ imported: number; ids: string[] }>('/crm/fundgate/import-all', {
      method: 'POST',
      body: JSON.stringify({ organizationId, managerId }),
    });
  },

  getFundGatePendingCount: async (organizationId: string): Promise<ApiResponse<{ pendingCount: number }>> => {
    return fetchApi<{ pendingCount: number }>(`/crm/fundgate/pending-count?organizationId=${organizationId}`);
  },

  updateMetrics: async (id: string, metrics: Record<string, unknown>): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(`/crm/startups/${id}/metrics`, {
      method: 'POST',
      body: JSON.stringify(metrics),
    });
  },

  getMetricsHistory: async (id: string): Promise<ApiResponse<unknown[]>> => {
    return fetchApi<unknown[]>(`/crm/startups/${id}/metrics/history`);
  },
};

export const investmentCommitteeApi = {
  getCommittees: async (organizationId: string): Promise<ApiResponse<InvestmentCommittee[]>> => {
    return fetchApi<InvestmentCommittee[]>(`/crm/investment-committee/meetings?organizationId=${encodeURIComponent(organizationId)}`);
  },

  getMeetings: async (organizationId: string): Promise<ApiResponse<InvestmentCommitteeMeeting[]>> => {
    return fetchApi<InvestmentCommitteeMeeting[]>(`/crm/investment-committee/meetings?organizationId=${encodeURIComponent(organizationId)}`);
  },

  createCommittee: async (
    payload: Partial<InvestmentCommittee> & {
      organizationId: string;
      startupIds?: string[];
      managerId?: string;
      managerName?: string;
    }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>('/crm/investment-committee/meetings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createMeeting: async (
    payload: Partial<InvestmentCommitteeMeeting> & {
      organizationId: string;
      startupIds?: string[];
      managerId?: string;
      managerName?: string;
    }
  ): Promise<ApiResponse<InvestmentCommitteeMeeting>> => {
    return fetchApi<InvestmentCommitteeMeeting>('/crm/investment-committee/meetings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCommittee: async (committeeId: string): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}`);
  },

  getMeeting: async (meetingId: string): Promise<ApiResponse<InvestmentCommitteeMeeting>> => {
    return fetchApi<InvestmentCommitteeMeeting>(`/crm/investment-committee/meetings/${meetingId}`);
  },

  updateCommittee: async (
    committeeId: string,
    payload: Partial<InvestmentCommittee> & { managerId?: string; managerName?: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateMeeting: async (
    meetingId: string,
    payload: Partial<InvestmentCommitteeMeeting> & { managerId?: string; managerName?: string }
  ): Promise<ApiResponse<InvestmentCommitteeMeeting>> => {
    return fetchApi<InvestmentCommitteeMeeting>(`/crm/investment-committee/meetings/${meetingId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  exportProtocol: async (
    committeeId: string,
    payload: { meeting?: Partial<InvestmentCommittee>; managerId?: string; managerName?: string } = {}
  ): Promise<ApiResponse<InvestmentCommitteeMeetingResult>> => {
    return fetchApi<InvestmentCommitteeMeetingResult>(`/crm/investment-committee/meetings/${committeeId}/protocol/export`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addComment: async (
    committeeId: string,
    payload: { text: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  applyApproval: async (
    committeeId: string,
    payload: {
      step: 'lawyer' | 'deputy' | 'director';
      action: 'approve' | 'request_changes' | 'sign';
      comment?: string;
      conclusion?: string;
      fileBase64?: string;
      fileName?: string;
      contentType?: string;
    }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/approval`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  finalizeShortlist: async (
    committeeId: string,
    payload?: Partial<InvestmentCommittee> & { startupIds?: string[]; managerId?: string; managerName?: string }
  ): Promise<DataRoomGateApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/shortlist/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  reopenShortlist: async (committeeId: string): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/shortlist/reopen`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  updateShortlistAmounts: async (
    committeeId: string,
    payload: { expectedShortlistExportId: string; amounts: Record<string, number> }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/shortlist/amounts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadSignedShortlist: async (
    committeeId: string,
    payload: { fileBase64: string; fileName: string; contentType: string; shortlistExportId: string }
  ): Promise<DataRoomGateApiResponse<{
    meeting?: InvestmentCommittee;
    committee?: InvestmentCommittee;
    file: InvestmentCommitteeFileRef;
  }>> => {
    return fetchApi<{
      meeting?: InvestmentCommittee;
      committee?: InvestmentCommittee;
      file: InvestmentCommitteeFileRef;
    }>(
      `/crm/investment-committee/meetings/${committeeId}/shortlist/upload-signed`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  reviewSignedShortlist: async (
    committeeId: string,
    payload: { action: 'approve' | 'request_changes'; comment?: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => fetchApi<InvestmentCommittee>(
    `/crm/investment-committee/meetings/${committeeId}/shortlist/review`,
    { method: 'POST', body: JSON.stringify(payload) }
  ),

  uploadApprovalDocument: async (
    committeeId: string,
    payload: { step: 'deputy' | 'director'; fileBase64: string; fileName: string; contentType: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => fetchApi<InvestmentCommittee>(
    `/crm/investment-committee/meetings/${committeeId}/approval-document`,
    { method: 'POST', body: JSON.stringify(payload) }
  ),

  saveDataRoomBlockerReasons: async (
    committeeId: string,
    payload: {
      expectedMeetingUpdatedAt: string;
      shortlistPatch?: InvestmentCommitteeShortlistPatch;
      reasons: DataRoomBlockerReasonInput[];
    }
  ): Promise<DataRoomGateApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(
      `/crm/investment-committee/meetings/${committeeId}/data-room-blocker-reasons`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  getProjectStartup: async (
    meetingId: string,
    startupId: string
  ): Promise<ApiResponse<Startup>> => {
    return fetchApi<Startup>(
      `/crm/investment-committee/meetings/${meetingId}/projects/${encodeURIComponent(startupId)}/startup`
    );
  },

  getProjectDossier: async (
    committeeId: string,
    startupId: string
  ): Promise<ApiResponse<InvestmentCommitteeDossier>> => {
    return fetchApi<InvestmentCommitteeDossier>(
      `/crm/investment-committee/meetings/${committeeId}/projects/${encodeURIComponent(startupId)}/dossier`
    );
  },

  getDataRoom: async (
    committeeId: string
  ): Promise<ApiResponse<InvestmentCommitteeDossier[]>> => {
    return fetchApi<InvestmentCommitteeDossier[]>(
      `/crm/investment-committee/meetings/${committeeId}/dataroom`
    );
  },

  cancelCommittee: async (
    committeeId: string,
    payload: { comment?: string } = {}
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelMeeting: async (
    meetingId: string,
    payload: { comment?: string } = {}
  ): Promise<ApiResponse<InvestmentCommitteeMeeting>> => {
    return fetchApi<InvestmentCommitteeMeeting>(`/crm/investment-committee/meetings/${meetingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteCommittee: async (committeeId: string): Promise<ApiResponse<{ id: string }>> => {
    return fetchApi<{ id: string }>(`/crm/investment-committee/meetings/${committeeId}`, {
      method: 'DELETE',
    });
  },

  deleteMeeting: async (meetingId: string): Promise<ApiResponse<{ id: string }>> => {
    return fetchApi<{ id: string }>(`/crm/investment-committee/meetings/${meetingId}`, {
      method: 'DELETE',
    });
  },

  advanceCommittee: async (
    committeeId: string,
    payload: { to: 'legal_review' }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(`/crm/investment-committee/meetings/${committeeId}/advance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  advanceMeeting: async (
    meetingId: string,
    payload: { to: 'signing' }
  ): Promise<ApiResponse<InvestmentCommitteeMeeting>> => {
    return fetchApi<InvestmentCommitteeMeeting>(`/crm/investment-committee/meetings/${meetingId}/advance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadProjectFile: async (
    committeeId: string,
    startupId: string,
    payload: { fileBase64: string; fileName: string; contentType: string; documentType: 'presentation' | 'invest_memo' }
  ): Promise<ApiResponse<{ meeting: InvestmentCommittee; file: InvestmentCommitteeFileRef }>> => {
    return fetchApi<{ meeting: InvestmentCommittee; file: InvestmentCommitteeFileRef }>(
      `/crm/investment-committee/meetings/${committeeId}/projects/${encodeURIComponent(startupId)}/files`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  updateProjectProtocol: async (
    committeeId: string,
    startupId: string,
    payload: { decision?: string; conditions?: string[] | string; resolution?: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(
      `/crm/investment-committee/meetings/${committeeId}/projects/${encodeURIComponent(startupId)}/protocol`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  voteOnProject: async (
    committeeId: string,
    startupId: string,
    payload: { vote: 'for' | 'against'; comment?: string; onBehalfOf?: string; onBehalfOfName?: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(
      `/crm/investment-committee/meetings/${committeeId}/projects/${encodeURIComponent(startupId)}/vote`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitChairDecision: async (
    committeeId: string,
    startupId: string,
    payload: { action: 'approve' | 'reject' | 'return'; comment?: string }
  ): Promise<ApiResponse<InvestmentCommittee>> => {
    return fetchApi<InvestmentCommittee>(
      `/crm/investment-committee/meetings/${committeeId}/projects/${encodeURIComponent(startupId)}/chair-decision`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  createRemoteSignatureRequest: async (
    committeeId: string,
    memberId: string,
    payload: {
      signerName?: string;
      signerEmail?: string;
      ttlDays?: number;
      meeting?: Partial<InvestmentCommittee>;
      managerId?: string;
      managerName?: string;
    } = {}
  ): Promise<ApiResponse<InvestmentCommitteeRemoteSignatureRequestResult>> => {
    return fetchApi<InvestmentCommitteeRemoteSignatureRequestResult>(
      `/crm/investment-committee/meetings/${committeeId}/signatures/${memberId}/remote-request`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  revokeRemoteSignature: async (
    committeeId: string,
    memberId: string,
  ): Promise<ApiResponse<{ revoked: number }>> => {
    return fetchApi<{ revoked: number }>(
      `/crm/investment-committee/meetings/${committeeId}/signatures/${memberId}/remote-request/revoke`,
      { method: 'POST' }
    );
  },

  uploadSignedDocument: async (
    committeeId: string,
    payload: {
      documentType?: 'signed_protocol';
      fileBase64: string;
      fileName: string;
      contentType: string;
      managerId?: string;
      managerName?: string;
    }
  ): Promise<ApiResponse<{ meeting: InvestmentCommittee; file: Record<string, unknown> }>> => {
    return fetchApi<{ meeting: InvestmentCommittee; file: Record<string, unknown> }>(
      `/crm/investment-committee/meetings/${committeeId}/signatures/upload`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  completeSignedProtocol: async (
    committeeId: string,
  ): Promise<ApiResponse<{ meeting: InvestmentCommittee; committee: InvestmentCommittee; completed: boolean }>> => {
    return fetchApi<{ meeting: InvestmentCommittee; committee: InvestmentCommittee; completed: boolean }>(
      `/crm/investment-committee/meetings/${committeeId}/signatures/complete`,
      { method: 'POST' }
    );
  },

  getRemoteSignatureRequest: async (token: string): Promise<ApiResponse<InvestmentCommitteeRemoteSignaturePublicView>> => {
    return fetchApi<InvestmentCommitteeRemoteSignaturePublicView>(
      `/crm/investment-committee/remote-signatures/${encodeURIComponent(token)}`
    );
  },

  signRemoteSignatureRequest: async (
    token: string,
    payload: {
      signerName: string;
      signerEmail?: string;
      signatureText: string;
      consentAccepted: boolean;
    }
  ): Promise<ApiResponse<InvestmentCommitteeRemoteSignaturePublicView>> => {
    return fetchApi<InvestmentCommitteeRemoteSignaturePublicView>(
      `/crm/investment-committee/remote-signatures/${encodeURIComponent(token)}/sign`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
};

export interface FundGateStartup {
  id: string;
  name: string;
  email?: string;
  aiScore: number;
  valuation: number;
  status: 'approved' | 'needs_improvement' | 'rejected';
  strengths: string[];
  weaknesses: string[];
  evaluatedAt?: string | Date;
  lastUpdated?: string | Date;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  managerId?: string;
  managerName?: string;
  managerAvatar?: string;
  founderName?: string;
  founderEmail?: string;
  startupName?: string;
  details?: string;
  amount?: number;
  fileName?: string;
  fieldChanges?: FieldChange[];
  createdAt: string | Date | { _seconds: number; _nanoseconds: number };
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
  trends?: {
    total: number;
    inWork: number;
    valuation: number;
    score: number;
  };
}

export interface RecentActivity {
  id: string;
  action: string;
  managerId?: string;
  managerName?: string;
  startupId: string;
  startupName: string;
  details?: string;
  amount?: number;
  createdAt: string | Date | { _seconds: number; _nanoseconds: number };
}

export interface DirectorManagerKpi {
  manager: { id: string; name: string; avatar?: string; branch?: string; role: string };
  workload: { new: number; in_review: number; pipeline: number; portfolio: number; rejected: number; total: number; active: number };
  interactions: { contacted: number; meeting: number; documents: number; total: number };
  conversion: { assigned: number; advanced: number; rate: number };
}

export interface DirectorKpis {
  period: { from: string; to: string };
  managers: DirectorManagerKpi[];
  timeline: Array<{ label: string; contacted: number; meeting: number; documents: number }>;
  totals: { managers: number; activeStartups: number; interactions: number; avgConversion: number };
}

export interface DirectorActivityEvent {
  startupId: string;
  startupName: string;
  managerId: string;
  managerName: string;
  action: string;
  details: string;
  at: number;
  fromStatus?: string;
  toStatus?: string;
}

export const directorApi = {
  getKpis: async (
    organizationId: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<DirectorKpis>> => {
    const search = new URLSearchParams({ organizationId });
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    return fetchApi<DirectorKpis>(`/crm/director/kpis?${search.toString()}`);
  },
  getActivity: async (
    organizationId: string,
    params?: { managerId?: string; action?: string; limit?: number; from?: string; to?: string }
  ): Promise<ApiResponse<DirectorActivityEvent[]>> => {
    const search = new URLSearchParams({ organizationId });
    if (params?.managerId) search.set('managerId', params.managerId);
    if (params?.action) search.set('action', params.action);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    return fetchApi<DirectorActivityEvent[]>(`/crm/director/activity?${search.toString()}`);
  },
};

export const dashboardApi = {
  getStats: async (organizationId: string): Promise<ApiResponse<DashboardStats>> => {
    return fetchApi<DashboardStats>(`/crm/dashboard/stats?organizationId=${organizationId}`);
  },

  getManagerActivity: async (organizationId: string): Promise<ApiResponse<unknown[]>> => {
    return fetchApi<unknown[]>(`/crm/dashboard/manager-activity?organizationId=${organizationId}`);
  },

  getRecentActivities: async (organizationId: string, limit?: number): Promise<ApiResponse<RecentActivity[]>> => {
    const params = limit ? `&limit=${limit}` : '';
    return fetchApi<RecentActivity[]>(`/crm/dashboard/recent-activities?organizationId=${organizationId}${params}`);
  },
};

export type UserRole =
  | 'ceo'
  | 'deputy_investment'
  | 'deputy_ma'
  | 'manager_investment'
  | 'manager_ma'
  | 'financier'
  | 'lawyer'
  | 'tech_specialist'
  | 'committee_member';

export type Branch = 'investment' | 'ma';

export const ROLE_LABELS: Record<UserRole, string> = {
  ceo: 'Генеральный директор',
  deputy_investment: 'Зам. директор',
  deputy_ma: 'Заместитель (M&A)',
  manager_investment: 'Инвест. менеджер',
  manager_ma: 'M&A менеджер',
  financier: 'Финансист',
  lawyer: 'Юрист',
  tech_specialist: 'Тех. специалист',
  committee_member: 'Член комитета',
};

export interface Manager {
  id: string;
  organizationId: string;
  login: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  branch?: Branch;
  phone?: string;
  position?: string;
  isActive: boolean;
  firebaseUid?: string;
  createdAt?: string | Date;
  lastLoginAt?: string | Date;
  commentsSeen?: Record<string, string>;
}

export interface PortfolioDashboardPreferences {
  version: 1;
  columnOrder: string[];
  hiddenColumnIds: string[];
}

export type PortfolioSegmentKey =
  | 'marketplace'
  | 'fintech'
  | 'saas'
  | 'ecommerce'
  | 'services'
  | 'hardware'
  | 'other';

export interface PortfolioSegmentThreshold {
  grossMarginGreen: number;
  grossMarginYellow: number;
  ebitdaMarginGreen: number;
  ebitdaMarginYellow: number;
}

export type PortfolioSegmentThresholds = Partial<
  Record<PortfolioSegmentKey, PortfolioSegmentThreshold>
>;

export interface PortfolioSettings {
  fundDisplayName?: string;
  reportingPeriod?: string;
  baseCurrency?: string;
  usdToUzs?: number;
  usdToKzt?: number;
  runwayGreen?: number;
  runwayYellow?: number;
  momGreen?: number;
  momYellow?: number;
  moicGreen?: number;
  moicYellow?: number;
  churnGreen?: number;
  churnYellow?: number;
  followOnRunway?: number;
  followOnMoic?: number;
  segmentThresholds?: PortfolioSegmentThresholds;
}

export interface FundIframeConfig {
  fund?: string;
  fundName?: string;
  formUrl?: string;
  snippet?: string;
  theme?: 'light' | 'dark' | 'auto' | string;
  primaryColor?: string;
  fundLogoUrl?: string;
  branding?: {
    fundLogoUrl?: string;
    primaryColor?: string;
    homeUrl?: string;
    poweredByUrl?: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  portfolioSettings?: PortfolioSettings;
  startupBoardSettings?: StartupBoardSettings;
  iframe?: FundIframeConfig;
  managersCount: number;
  startupsCount: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const authApi = {
  login: async (login: string, password: string): Promise<ApiResponse<{ manager: Manager; organization: Organization; accessToken?: string; authToken?: string; expiresAt?: string }>> => {
    return fetchApi<{ manager: Manager; organization: Organization; accessToken?: string; authToken?: string; expiresAt?: string }>('/crm/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
  },

  me: async (): Promise<ApiResponse<{ manager: Manager; organization: Organization | null }>> => {
    return fetchApi<{ manager: Manager; organization: Organization | null }>('/crm/auth/me');
  },
};

export const organizationApi = {
  getById: async (organizationId: string): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(`/crm/organizations/${organizationId}`);
  },

  update: async (organizationId: string, data: Partial<Organization>): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(`/crm/organizations/${organizationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updatePortfolioSettings: async (organizationId: string, portfolioSettings: PortfolioSettings): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(`/crm/organizations/${organizationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ portfolioSettings }),
    });
  },

  updateStartupBoardSettings: async (organizationId: string, startupBoardSettings: StartupBoardSettings): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(`/crm/organizations/${organizationId}/startup-board-settings`, {
      method: 'PATCH',
      body: JSON.stringify({ startupBoardSettings }),
    });
  },

  deleteStartupBoardColumn: async (
    organizationId: string,
    columnId: string,
    targetColumnId: string
  ): Promise<ApiResponse<{ organization: Organization; movedCount: number }>> => {
    return fetchApi<{ organization: Organization; movedCount: number }>(
      `/crm/organizations/${organizationId}/startup-board-columns/${columnId}/delete`,
      {
        method: 'POST',
        body: JSON.stringify({ targetColumnId }),
      }
    );
  },

  getStartupBoardHistory: async (organizationId: string): Promise<ApiResponse<StartupBoardHistoryEntry[]>> => {
    return fetchApi<StartupBoardHistoryEntry[]>(`/crm/organizations/${organizationId}/startup-board-history`);
  },

  restoreStartupBoardHistory: async (organizationId: string, entryId: string): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(
      `/crm/organizations/${organizationId}/startup-board-history/${entryId}/restore`,
      { method: 'POST' }
    );
  },

  runQuarterlyReportReminders: (
    organizationId: string,
    payload: {
      dryRun?: boolean;
      sendNotifications?: boolean;
      dueInDays?: number;
      dueDate?: string;
      message?: string;
      locale?: string;
      period?: { year: number; quarter: QuarterlyReportQuarter };
    } = {},
  ): Promise<ApiResponse<QuarterlyReportReminderRunResult>> =>
    fetchApi<QuarterlyReportReminderRunResult>(`/crm/organizations/${organizationId}/quarterly-report-reminders/run`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadLogo: async (organizationId: string, logoBase64: string, contentType: string): Promise<ApiResponse<{ logoUrl: string }>> => {
    return fetchApi<{ logoUrl: string }>(`/crm/organizations/${organizationId}/logo`, {
      method: 'POST',
      body: JSON.stringify({ logoBase64, contentType }),
    });
  },

  updateIframeBranding: async (
    organizationId: string,
    branding: { primaryColor: string; theme: 'light' | 'dark' | 'auto' },
  ): Promise<ApiResponse<Organization>> => {
    return fetchApi<Organization>(`/crm/organizations/${organizationId}/iframe-branding`, {
      method: 'PATCH',
      body: JSON.stringify(branding),
    });
  },
};

export interface ManagerPerformance {
  manager: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    position?: string;
    department?: string;
  };
  stats: {
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    inProgress: number;
    conversionRate: number;
    avgTimeToClose: number;
  };
  monthlyStats: Array<{
    month: string;
    deals: number;
    value: number;
    won: number;
    lost: number;
  }>;
  recentDeals: Startup[];
}

export const managerApi = {
  getMyPortfolioDashboardPreferences: async (): Promise<ApiResponse<PortfolioDashboardPreferences>> => {
    return fetchApi<PortfolioDashboardPreferences>('/crm/managers/me/ui-preferences/portfolio-dashboard');
  },

  updateMyPortfolioDashboardPreferences: async (
    preferences: PortfolioDashboardPreferences,
  ): Promise<ApiResponse<PortfolioDashboardPreferences>> => {
    return fetchApi<PortfolioDashboardPreferences>('/crm/managers/me/ui-preferences/portfolio-dashboard', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  getById: async (managerId: string): Promise<ApiResponse<Manager>> => {
    return fetchApi<Manager>(`/crm/managers/${managerId}`);
  },

  getPerformance: async (managerId: string): Promise<ApiResponse<ManagerPerformance>> => {
    return fetchApi<ManagerPerformance>(`/crm/managers/${managerId}/performance`);
  },

  getStartups: async (managerId: string): Promise<ApiResponse<Startup[]>> => {
    return fetchApi<Startup[]>(`/crm/managers/${managerId}/startups`);
  },

  getMyProgress: async (): Promise<ApiResponse<ManagerPerformance>> => {
    return fetchApi<ManagerPerformance>('/crm/my-progress');
  },

  updateProfile: async (
    managerId: string,
    data: { name?: string; email?: string; phone?: string; position?: string; location?: string }
  ): Promise<ApiResponse<Manager>> => {
    return fetchApi<Manager>(`/crm/managers/${managerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (
    managerId: string,
    avatarBase64: string,
    contentType: string
  ): Promise<ApiResponse<{ avatarUrl: string }>> => {
    return fetchApi<{ avatarUrl: string }>(`/crm/managers/${managerId}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ avatarBase64, contentType }),
    });
  },

  changePassword: async (
    managerId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi<{ message: string }>(`/crm/auth/users/${managerId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

export interface DashboardCharts {
  applicationsFlow: Array<{ month: string; value: number }>;
  closedDeals: Array<{ month: string; value: number }>;
  monthlyDeals: Array<{ month: string; count: number; value: number }>;
  conversionFunnel: Array<{ stage: string; count: number }>;
  performanceTrend: Array<{ date: string; value: number }>;
  stageBreakdown: Array<{ stage: string; count: number }>;
}

export const chartsApi = {
  getDashboardCharts: async (organizationId: string, period?: 'day' | 'week' | 'month'): Promise<ApiResponse<DashboardCharts>> => {
    const params = new URLSearchParams({ organizationId });
    if (period) params.set('period', period);
    return fetchApi<DashboardCharts>(`/crm/dashboard/charts?${params.toString()}`);
  },
};

export interface CreateUserData {
  name: string;
  login: string;
  email?: string;
  role: UserRole;
  branch?: Branch;
  phone?: string;
  position?: string;
}

export interface CreateUserResponse {
  user: Manager;
  password: string;
}

export const teamApi = {
  getMembers: async (organizationId: string): Promise<ApiResponse<Manager[]>> => {
    return fetchApi<Manager[]>(`/crm/auth/users?organizationId=${organizationId}`);
  },

  create: async (organizationId: string, data: CreateUserData): Promise<ApiResponse<CreateUserResponse>> => {
    return fetchApi<CreateUserResponse>('/crm/auth/users', {
      method: 'POST',
      body: JSON.stringify({ organizationId, ...data }),
    });
  },

  update: async (userId: string, data: Partial<CreateUserData & { isActive: boolean }>): Promise<ApiResponse<Manager>> => {
    return fetchApi<Manager>(`/crm/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (userId: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/auth/users/${userId}`, {
      method: 'DELETE',
    });
  },

  resetPassword: async (userId: string): Promise<ApiResponse<{ newPassword: string }>> => {
    return fetchApi<{ newPassword: string }>(`/crm/auth/users/${userId}/reset-password`, {
      method: 'POST',
    });
  },

  toggleStatus: async (userId: string): Promise<ApiResponse<{ isActive: boolean }>> => {
    return fetchApi<{ isActive: boolean }>(`/crm/auth/users/${userId}/toggle-status`, {
      method: 'POST',
    });
  },
};

export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  imageUrl?: string;
  isPublished: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const articlesApi = {
  getAll: async (category?: string): Promise<ApiResponse<Article[]>> => {
    const params = category ? `?category=${category}` : '';
    return fetchApi<Article[]>(`/crm/articles${params}`);
  },

  getById: async (id: string): Promise<ApiResponse<Article>> => {
    return fetchApi<Article>(`/crm/articles/${id}`);
  },
};

export interface AIMessageImage {
  type: 'image';
  data: string; // base64
  mimeType: string;
}

export interface AIMessageDocument {
  type: 'document';
  data: string; // base64
  mimeType: string;
  fileName: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: AIMessageImage[];
  documents?: AIMessageDocument[];
}

export interface StartupWidgetData {
  id: string;
  companyName: string;
  industry: string;
  status: string;
  score?: number;
  valuation?: number;
  fundingRequest?: number;
  description?: string;
  logo?: string;
  stage?: string;
  source?: string;
  assignedManager?: {
    id: string;
    name: string;
    avatar?: string;
  };
  investmentAmount?: number;
  revenue?: number;
  foundedYear?: number;
  teamSize?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
}

export interface AIStreamEvent {
  type: 'text' | 'tool_start' | 'done' | 'error' | 'startup_widget' | 'startups_list';
  content?: string;
  tool?: string;
  startup?: StartupWidgetData;
  startups?: StartupWidgetData[];
}

export type AIStreamCallback = (event: AIStreamEvent) => void;

export const aiApi = {
  chatStream: async (
    messages: AIMessage[],
    onEvent: AIStreamCallback,
    context?: Record<string, unknown>,
    useTools = true
  ): Promise<void> => {
    const response = await fetch(`${AI_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAiAuthHeaders(),
      },
      body: JSON.stringify({
        messages,
        stream: true,
        context,
        use_tools: useTools,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) {
            try {
              const event = JSON.parse(data) as AIStreamEvent;
              onEvent(event);
            } catch (e) {
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      }
    }
  },

  chat: async (
    messages: AIMessage[],
    context?: Record<string, unknown>
  ): Promise<{ text: string }> => {
    const response = await fetch(`${AI_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAiAuthHeaders(),
      },
      body: JSON.stringify({
        messages,
        stream: false,
        context,
        use_tools: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.response;
  },

  analyzeStartup: async (startup: Record<string, unknown>): Promise<ApiResponse<{
    score: number;
    valuation: number;
    strengths: string[];
    weaknesses: string[];
    marketAnalysis: string;
    teamAnalysis: string;
    productAnalysis: string;
    financialAnalysis: string;
    recommendation: string;
    generatedAt: string;
  }>> => {
    const response = await fetch(`${AI_API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startup }),
    });

    return response.json();
  },

  analyzeFile: async (
    file: File,
    prompt?: string
  ): Promise<{
    success: boolean;
    analysis: string;
    file_type: 'image' | 'document';
    file_name: string;
    file_size: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch(`${AI_API_URL}/api/analyze-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File analysis failed: ${response.status}`);
    }

    return response.json();
  },

  health: async (): Promise<{ status: string; model: string }> => {
    const response = await fetch(`${AI_API_URL}/health`);
    return response.json();
  },
};

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  startupWidget?: StartupWidgetData;
  startupsList?: StartupWidgetData[];
  artifact?: AIArtifactPayload;
}

export interface AIChatThread {
  id: string;
  managerId: string;
  organizationId?: string;
  title: string;
  preview: string;
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const aiChatApi = {
  getAll: async (managerId: string, organizationId?: string): Promise<ApiResponse<AIChatThread[]>> => {
    const params = new URLSearchParams({ managerId });
    if (organizationId) params.append('organizationId', organizationId);
    return fetchApi<AIChatThread[]>(`/crm/ai-chats?${params.toString()}`);
  },

  getById: async (id: string): Promise<ApiResponse<AIChatThread>> => {
    return fetchApi<AIChatThread>(`/crm/ai-chats/${id}`);
  },

  create: async (
    managerId: string,
    organizationId?: string,
    title?: string,
    messages?: AIChatMessage[]
  ): Promise<ApiResponse<AIChatThread>> => {
    return fetchApi<AIChatThread>('/crm/ai-chats', {
      method: 'POST',
      body: JSON.stringify({ managerId, organizationId, title, messages }),
    });
  },

  update: async (
    id: string,
    data: { title?: string; messages?: AIChatMessage[]; preview?: string }
  ): Promise<ApiResponse<AIChatThread>> => {
    return fetchApi<AIChatThread>(`/crm/ai-chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/ai-chats/${id}`, {
      method: 'DELETE',
    });
  },
};

export interface Invitation {
  id: string;
  token: string;
  role: UserRole;
  branch?: Branch;
  createdByName: string;
  expiresAt: string;
  createdAt: string;
  isExpired?: boolean;
  inviteUrl?: string;
  organization?: {
    id: string;
    name: string;
    fundId?: string;
    logo?: string;
  };
}

export interface PendingRegistration {
  id: string;
  organizationId: string;
  invitationId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  branch?: Branch;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const invitationApi = {
  create: async (
    creatorId: string,
    organizationId: string,
    role: UserRole,
    branch?: Branch
  ): Promise<ApiResponse<Invitation>> => {
    return fetchApi<Invitation>('/crm/invitations', {
      method: 'POST',
      body: JSON.stringify({ creatorId, organizationId, role, branch }),
    });
  },

  getAll: async (organizationId: string): Promise<ApiResponse<Invitation[]>> => {
    return fetchApi<Invitation[]>(`/crm/invitations?organizationId=${organizationId}`);
  },

  validate: async (token: string): Promise<ApiResponse<Invitation>> => {
    return fetchApi<Invitation>(`/crm/invitations/validate/${token}`);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/invitations/${id}`, {
      method: 'DELETE',
    });
  },
};

export const registrationApi = {
  register: async (
    token: string,
    name: string,
    email: string,
    phone?: string
  ): Promise<ApiResponse<{ id: string; status: string; message: string }>> => {
    return fetchApi<{ id: string; status: string; message: string }>('/crm/register', {
      method: 'POST',
      body: JSON.stringify({ token, name, email, phone }),
    });
  },

  getPending: async (organizationId: string): Promise<ApiResponse<PendingRegistration[]>> => {
    return fetchApi<PendingRegistration[]>(`/crm/pending-registrations?organizationId=${organizationId}`);
  },

  approve: async (
    registrationId: string,
    approverId: string
  ): Promise<ApiResponse<{ managerId: string; login: string; password: string; message: string }>> => {
    return fetchApi<{ managerId: string; login: string; password: string; message: string }>(
      `/crm/registrations/${registrationId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ approverId }),
      }
    );
  },

  reject: async (
    registrationId: string,
    approverId: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi<{ message: string }>(`/crm/registrations/${registrationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approverId, reason }),
    });
  },
};

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
  status: 'new' | 'in_review' | 'approved' | 'rejected';
  source: 'Platform' | 'Manual';
  platformInvestorId?: string;
  assignedManagerId?: string;
  assignedManager?: Manager;
  comments?: unknown[];
  activityLog?: unknown[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PlatformInvestor {
  id: string;
  fundName?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  stages?: string[];
  checkFrom?: number;
  checkTo?: number;
  industries?: string[];
  request?: string;
  createdAt?: string | Date;
}

export const investorApplicationsApi = {
  getAll: async (organizationId: string): Promise<ApiResponse<InvestorApplication[]>> => {
    return fetchApi<InvestorApplication[]>(`/crm/investor-applications?organizationId=${organizationId}`);
  },

  getById: async (id: string): Promise<ApiResponse<InvestorApplication>> => {
    return fetchApi<InvestorApplication>(`/crm/investor-applications/${id}`);
  },

  create: async (data: Partial<InvestorApplication>): Promise<ApiResponse<InvestorApplication>> => {
    return fetchApi<InvestorApplication>('/crm/investor-applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<InvestorApplication>): Promise<ApiResponse<InvestorApplication>> => {
    return fetchApi<InvestorApplication>(`/crm/investor-applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchApi<void>(`/crm/investor-applications/${id}`, {
      method: 'DELETE',
    });
  },

  addActivity: async (
    id: string,
    activity: { action: string; managerId?: string; managerName?: string; details?: string }
  ): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/crm/investor-applications/${id}/activity`, {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  addComment: async (
    id: string,
    comment: { managerId?: string; managerName?: string; text: string }
  ): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/crm/investor-applications/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  },

  getAvailableImports: async (organizationId: string): Promise<ApiResponse<PlatformInvestor[]>> => {
    return fetchApi<PlatformInvestor[]>(`/crm/investor-applications/import/available?organizationId=${organizationId}`);
  },

  importFromPlatform: async (
    investorId: string,
    organizationId: string,
    managerId?: string,
    managerName?: string
  ): Promise<ApiResponse<InvestorApplication>> => {
    return fetchApi<InvestorApplication>('/crm/investor-applications/import', {
      method: 'POST',
      body: JSON.stringify({ investorId, organizationId, managerId, managerName }),
    });
  },
};

export type QuarterlyReportQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface QuarterlyReportFilePayload {
  fileBase64: string;
  fileName: string;
  contentType: string;
  field?: string;
}

export interface QuarterlyReportPayload {
  requestId?: string;
  period: {
    year: number;
    quarter: QuarterlyReportQuarter;
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
  files: QuarterlyReportFilePayload[];
}

export interface QuarterlyReport extends Omit<QuarterlyReportPayload, 'files'> {
  id: string;
  startupId: string;
  requestId?: string;
  files: Array<{
    url: string;
    fileName: string;
    contentType: string;
    size?: number;
    storagePath?: string;
  }>;
  status: 'submitted' | 'in_review' | 'approved' | 'changes_requested';
  submittedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  reviewedAt?: string | Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  revisionCount?: number;
}

export type QuarterlyReportRequestStatus = 'requested' | 'submitted' | 'approved' | 'changes_requested' | 'cancelled';

export interface QuarterlyReportRequest {
  id: string;
  startupId: string;
  organizationId: string;
  startupName: string;
  founderEmail: string;
  founderPhone?: string | null;
  period: {
    year: number;
    quarter: QuarterlyReportQuarter;
  };
  dueDate?: string;
  message?: string;
  status: QuarterlyReportRequestStatus;
  reportId?: string;
  managerId?: string;
  managerName?: string;
  reviewNote?: string;
  requestedAt?: string | Date;
  remindedAt?: string | Date;
  submittedAt?: string | Date;
  reviewedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface QuarterlyReportReminderRunResult {
  period: {
    year: number;
    quarter: QuarterlyReportQuarter;
  };
  dueDate: string;
  dryRun: boolean;
  sendNotifications: boolean;
  scannedCount: number;
  eligibleCount: number;
  createdCount: number;
  skippedCount: number;
  emailAttemptedCount: number;
  smsAttemptedCount: number;
  items: Array<{
    startupId: string;
    startupName: string;
    organizationId: string;
    founderEmail?: string | null;
    founderPhone?: string | null;
    action: 'created' | 'would_create' | 'skipped';
    reason?: string;
    requestId?: string;
  }>;
}

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
  period: {
    year: number;
    quarter: QuarterlyReportQuarter;
  };
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

export const cabinetApi = {
  createCabinet: (startupId: string) =>
    fetchApi<{ login: string; password: string; email: string }>(`/crm/startups/${startupId}/cabinet`, { method: 'POST' }),

  getCabinetStatus: (startupId: string) =>
    fetchApi<{ exists: boolean; login?: string; createdAt?: string }>(`/crm/startups/${startupId}/cabinet`),

  login: (login: string, password: string) =>
    fetchApi<{ token: string; startup: any }>('/cabinet/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
      headers: { 'Content-Type': 'application/json' },
    }),

  getMyApplication: (token: string) =>
    fetchApi<any>('/cabinet/application', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateMyApplication: (token: string, data: any) =>
    fetchApi<any>('/cabinet/application', {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  resubmitForAnalysis: (token: string) =>
    fetchApi<{ success: boolean; nextAvailableAt: string }>('/cabinet/resubmit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  submitReport: (token: string, data: QuarterlyReportPayload) =>
    fetchApi<QuarterlyReport>('/cabinet/reports', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  getMyReports: (token: string) =>
    fetchApi<QuarterlyReport[]>('/cabinet/reports', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getStartupReports: (startupId: string) =>
    fetchApi<QuarterlyReport[]>(`/crm/startups/${startupId}/reports`),

  getStartupReportRequests: (startupId: string) =>
    fetchApi<QuarterlyReportRequest[]>(`/crm/startups/${startupId}/quarterly-report-requests`),

  createStartupReportRequest: (
    startupId: string,
    payload: {
      year: number;
      quarter: QuarterlyReportQuarter;
      dueDate?: string;
      message?: string;
      managerId?: string;
      managerName?: string;
      locale?: string;
    },
  ) =>
    fetchApi<QuarterlyReportRequest>(`/crm/startups/${startupId}/quarterly-report-requests`, {
      method: 'POST',
      body: JSON.stringify({
        period: {
          year: payload.year,
          quarter: payload.quarter,
        },
        dueDate: payload.dueDate,
        message: payload.message,
        managerId: payload.managerId,
        managerName: payload.managerName,
        locale: payload.locale,
      }),
    }),

  remindStartupReportRequest: (
    startupId: string,
    requestId: string,
    payload: { managerId?: string; managerName?: string; locale?: string },
  ) =>
    fetchApi<{ requestId: string; remindedAt: string }>(`/crm/startups/${startupId}/quarterly-report-requests/${requestId}/remind`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reviewStartupReport: (startupId: string, reportId: string, review: { status: QuarterlyReport['status']; note?: string; reviewNote?: string; reviewedBy?: string; reviewedByName?: string; locale?: string }) =>
    fetchApi<QuarterlyReport>(`/crm/startups/${startupId}/reports/${reportId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(review),
    }),

  getPortfolioRadar: (organizationId: string) =>
    fetchApi<PortfolioRadarResult>(`/crm/portfolio/radar?organizationId=${encodeURIComponent(organizationId)}`),

  getPortfolioQuarterlyDigests: (organizationId: string) =>
    fetchApi<QuarterlyReportDigest[]>(`/crm/portfolio/quarterly-digests?organizationId=${encodeURIComponent(organizationId)}`),

  generateStartupReportDigest: (startupId: string, reportId: string) =>
    fetchApi<QuarterlyReportDigest>(`/crm/startups/${startupId}/reports/${reportId}/digest`, {
      method: 'POST',
    }),

  getPendingChanges: (startupId: string) =>
    fetchApi<PendingChangeSet[]>(`/crm/startups/${startupId}/pending-changes`),

  reviewPendingChange: (startupId: string, changeId: string, review: { action: 'approve' | 'reject'; reviewedBy?: string; reviewedByName?: string; note?: string }) =>
    fetchApi<PendingChangeSet>(`/crm/startups/${startupId}/pending-changes/${changeId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(review),
    }),

  directorReviewPendingChange: (startupId: string, changeId: string, review: { action: 'approve' | 'reject'; reviewedBy?: string; reviewedByName?: string; note?: string }) =>
    fetchApi<PendingChangeSet>(`/crm/startups/${startupId}/pending-changes/${changeId}/director-review`, {
      method: 'PATCH',
      body: JSON.stringify(review),
    }),

  importItParkPortfolio: (payload: { fileBase64: string; fileName: string; contentType?: string; organizationId?: string }) =>
    fetchApi<ImportBatch>('/crm/imports/itpark-portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getImportBatch: (batchId: string) =>
    fetchApi<ImportBatch>(`/crm/imports/${batchId}`),

  analyzeImportBatch: (batchId: string, payload?: { organizationId?: string }) =>
    fetchApi<PortfolioImportAnalysis>(`/crm/imports/${batchId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  applyImportBatch: (batchId: string, payload: { organizationId?: string; decisions: PortfolioImportApplyDecision[] }) =>
    fetchApi<PortfolioImportApplySummary>(`/crm/imports/${batchId}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createImportAssistantChat: (batchId: string, payload?: { organizationId?: string; managerId?: string }) =>
    fetchApi<{ chatId: string }>(`/crm/imports/${batchId}/assistant-chat`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  createFinancialExtraction: (startupId: string, payload: { fileBase64: string; fileName: string; contentType?: string; documentType?: string }) =>
    fetchApi<{ extractionId: string; status: string; derivedMetrics?: Record<string, unknown>; diff?: Record<string, unknown> }>(`/crm/startups/${startupId}/financial-extractions`, {
      method: 'POST',
      body: JSON.stringify(payload),
  }),
};

export const importsApi = {
  importItParkPortfolio: cabinetApi.importItParkPortfolio,
  getImportBatch: cabinetApi.getImportBatch,
  analyzeImportBatch: cabinetApi.analyzeImportBatch,
  applyImportBatch: cabinetApi.applyImportBatch,
  createImportAssistantChat: cabinetApi.createImportAssistantChat,
};

export interface CreateFeedbackInput {
  description: string;
  userImages: File[];
  autoScreenshot: File | null;
  userEmail?: string;
  userId?: string;
  pageUrl?: string;
  userAgent?: string;
}

function buildFeedbackFormData(input: CreateFeedbackInput): FormData {
  const fd = new FormData();
  fd.append('description', input.description);
  if (input.userEmail) fd.append('userEmail', input.userEmail);
  if (input.userId) fd.append('userId', input.userId);
  if (input.pageUrl) fd.append('pageUrl', input.pageUrl);
  if (input.userAgent) fd.append('userAgent', input.userAgent);
  for (const file of input.userImages) {
    fd.append('userImages', file, file.name);
  }
  if (input.autoScreenshot) {
    fd.append('autoScreenshot', input.autoScreenshot, input.autoScreenshot.name);
  }
  return fd;
}

export const bugReportsApi = {
  create: async (input: CreateFeedbackInput): Promise<ApiResponse<{ id: string; imageUrls: string[] }>> => {
    return fetchApi<{ id: string; imageUrls: string[] }>('/crm/bug-reports', {
      method: 'POST',
      body: buildFeedbackFormData(input),
    });
  },
};

export const proposalsApi = {
  create: async (input: CreateFeedbackInput): Promise<ApiResponse<{ id: string; imageUrls: string[] }>> => {
    return fetchApi<{ id: string; imageUrls: string[] }>('/crm/proposals', {
      method: 'POST',
      body: buildFeedbackFormData(input),
    });
  },
};

export default {
  news: newsApi,
  startups: startupsApi,
  dashboard: dashboardApi,
  auth: authApi,
  organization: organizationApi,
  manager: managerApi,
  charts: chartsApi,
  articles: articlesApi,
  ai: aiApi,
  team: teamApi,
  invitation: invitationApi,
  registration: registrationApi,
  investorApplications: investorApplicationsApi,
  cabinet: cabinetApi,
  imports: importsApi,
  bugReports: bugReportsApi,
  proposals: proposalsApi,
};
