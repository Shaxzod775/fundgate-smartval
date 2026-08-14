export type Currency = 'USD' | 'EUR' | 'UZS';

export interface Investor {
  source: string;
  investorName: string;
  amount: number;
  currency: Currency;
}

export interface Investment {
  investors: Investor[];
  valuation: number;
  currency: Currency;
  date: string;
}

export interface SocialLinks {
  linkedin?: string;
  facebook?: string;
  telegram?: string;
  twitter?: string;
  instagram?: string;
}

export type TeamMemberType = 'cofounder' | 'member';

export interface TeamMember {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  background: string;
  type: TeamMemberType;
  socialLinks?: SocialLinks;
}

export interface StepAData {
  name: string;
  industry: string;
  description: string;
  stage: string;
  employees: number;
  logo: File | null;

  hasUsers: boolean;
  userCount?: string;
  activeUsersFirstMonth?: number;
  payingUsersFirstMonth?: number;

  hasPayingCustomers: boolean;
  revenueFirstMonth?: string;
  customerAcquisitionCost?: string;
  churnRate?: string;
  growthRateLast3Months?: string;
  itpvFundingRequest?: string;
  totalRoundSize?: string;

  hasTechnology: boolean;
  technologyDescription?: string;

  businessModel: string;
  customBusinessModel?: string;
  businessModelDescription?: string;

  foundingDate: string;
  country: string;

  hasInvestments: boolean;
  investments: Investment[];
}

export interface StepBData {
  firstName: string;
  lastName: string;
  role: string;
  customRole?: string;
  email: string;
  phone: string;
  website?: string;
  background: string;
  successfulProject?: string;
  socialLinks: SocialLinks;
  teamMembers: TeamMember[];
}

export interface StepCData {
  pitchDeck: File | null;
  onePager: File | null;
  financialModel: File | null;
  financialModelDescription?: string;
  currentRevenueBurnRate?: string;
  futurePlans?: string;
  videoLink?: string;
  termsAccepted: boolean;
}

export interface CrmData {
  status: string;
  assignedManagerId: string;
  assignedManagerName: string;
}

export interface WizardFormData {
  stepA: StepAData;
  stepB: StepBData;
  stepC: StepCData;
  crm: CrmData;
}

export const initialStepA: StepAData = {
  name: '',
  industry: '',
  description: '',
  stage: '',
  employees: 1,
  logo: null,
  hasUsers: false,
  hasPayingCustomers: false,
  itpvFundingRequest: '',
  totalRoundSize: '',
  hasTechnology: false,
  businessModel: '',
  foundingDate: '',
  country: '',
  hasInvestments: false,
  investments: [],
};

export const initialStepB: StepBData = {
  firstName: '',
  lastName: '',
  role: '',
  email: '',
  phone: '',
  background: '',
  socialLinks: {},
  teamMembers: [],
};

export const initialStepC: StepCData = {
  pitchDeck: null,
  onePager: null,
  financialModel: null,
  termsAccepted: false,
};

export const initialCrm: CrmData = {
  status: 'new',
  assignedManagerId: '',
  assignedManagerName: '',
};
