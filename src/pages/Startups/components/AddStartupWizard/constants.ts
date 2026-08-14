export const INDUSTRIES = [
  'AdTech',
  'AgriTech',
  'AI & ML',
  'AI & Food Tech',
  'BI & Analytics',
  'B2B/E-commerce/SaaS',
  'ClimateTech & Sustainability',
  'Conversational AI',
  'Cybersecurity',
  'E-commerce & Retail Tech',
  'EdTech',
  'Energy & CleanTech',
  'Entertainment & Media',
  'FinTech',
  'FoodTech',
  'Gaming',
  'GovTech',
  'HealthTech & MedTech',
  'HRTech',
  'InsurTech',
  'IoT & Hardware',
  'LegalTech',
  'Logistics & Supply Chain',
  'Marketing & AdTech',
  'Mobility & Transportation',
  'PropTech',
  'RegTech',
  'Robotics & Automation',
  'SaaS',
  'Social Media & Networking',
  'SpaceTech',
  'SportsTech',
  'TravelTech',
  'Web3 & Blockchain',
  'Telecom',
  'Other',
] as const;

export const STAGES = [
  { value: 'Idea', labelKey: 'wizard.stages.idea' },
  { value: 'MVP', labelKey: 'wizard.stages.mvp' },
  { value: 'Prototype', labelKey: 'wizard.stages.prototype' },
  { value: 'Pre-Seed', labelKey: 'wizard.stages.preSeed' },
  { value: 'Seed', labelKey: 'wizard.stages.seed' },
  { value: 'Growth', labelKey: 'wizard.stages.growth' },
  { value: 'Series A', labelKey: 'wizard.stages.roundA' },
  { value: 'Series B', labelKey: 'wizard.stages.roundB' },
  { value: 'Series C', labelKey: 'wizard.stages.roundC' },
] as const;

export const STAGE_TO_CRM: Record<string, string> = {
  'Idea': 'Idea',
  'MVP': 'MVP',
  'Prototype': 'Prototype',
  'Pre-Seed': 'Pre-Seed',
  'Seed': 'Seed',
  'Growth': 'Growth',
  'Series A': 'Series A',
  'Series B': 'Series B',
  'Series C': 'Series C',
};

export const MVP_PLUS_STAGES = ['Pre-Seed', 'Seed', 'Growth', 'Series A', 'Series B', 'Series C'];

export const REVENUE_MODELS = [
  { value: 'Subscription (SaaS)', labelKey: 'wizard.revenueModels.subscription' },
  { value: 'Transactional / Commission', labelKey: 'wizard.revenueModels.transactional' },
  { value: 'Marketplace take-rate', labelKey: 'wizard.revenueModels.marketplaceTakeRate' },
  { value: 'Freemium', labelKey: 'wizard.revenueModels.freemium' },
  { value: 'Advertising', labelKey: 'wizard.revenueModels.advertising' },
  { value: 'Licensing / IP', labelKey: 'wizard.revenueModels.licensing' },
  { value: 'Hardware + Recurring', labelKey: 'wizard.revenueModels.hardwareRecurring' },
  { value: 'Lead gen / Affiliate', labelKey: 'wizard.revenueModels.leadGen' },
  { value: 'Data monetization', labelKey: 'wizard.revenueModels.dataMonetization' },
  { value: 'Other', labelKey: 'wizard.revenueModels.other' },
] as const;

export const VALUE_DELIVERY_MODELS = [
  { value: 'Direct (own channel)', labelKey: 'wizard.valueDeliveryModels.direct' },
  { value: 'Marketplace / Platform', labelKey: 'wizard.valueDeliveryModels.marketplacePlatform' },
  { value: 'Aggregator', labelKey: 'wizard.valueDeliveryModels.aggregator' },
  { value: 'Full-stack / Integrated', labelKey: 'wizard.valueDeliveryModels.fullStack' },
  { value: 'White-label / B2B2C', labelKey: 'wizard.valueDeliveryModels.whiteLabel' },
  { value: 'API / Infrastructure', labelKey: 'wizard.valueDeliveryModels.apiInfrastructure' },
  { value: 'Other', labelKey: 'wizard.valueDeliveryModels.other' },
] as const;

export const CUSTOMER_SEGMENTS = [
  { value: 'B2C', labelKey: 'wizard.customerSegments.b2c' },
  { value: 'B2B (SMB)', labelKey: 'wizard.customerSegments.b2bSmb' },
  { value: 'B2B (Enterprise)', labelKey: 'wizard.customerSegments.b2bEnterprise' },
  { value: 'B2B2C', labelKey: 'wizard.customerSegments.b2b2c' },
  { value: 'B2G (Government)', labelKey: 'wizard.customerSegments.b2g' },
  { value: 'D2C', labelKey: 'wizard.customerSegments.d2c' },
  { value: 'Other', labelKey: 'wizard.customerSegments.other' },
] as const;

export const BUSINESS_MODELS = [
  { value: 'B2B', labelKey: 'wizard.businessModels.b2b' },
  { value: 'B2C', labelKey: 'wizard.businessModels.b2c' },
  { value: 'B2B2C', labelKey: 'wizard.businessModels.b2b2c' },
  { value: 'Marketplace', labelKey: 'wizard.businessModels.marketplace' },
  { value: 'SaaS', labelKey: 'wizard.businessModels.saas' },
  { value: 'Freemium', labelKey: 'wizard.businessModels.freemium' },
  { value: 'E-commerce', labelKey: 'wizard.businessModels.ecommerce' },
  { value: 'Advertising', labelKey: 'wizard.businessModels.advertising' },
  { value: 'Commission', labelKey: 'wizard.businessModels.commission' },
  { value: 'Other', labelKey: 'wizard.businessModels.other' },
] as const;

export const USER_COUNT_RANGES = [
  'Less than 100',
  '100-1,000',
  '1,000-10,000',
  'More than 10,000',
] as const;

export const INVESTMENT_SOURCES = [
  { value: 'Angel', labelKey: 'wizard.investmentSources.angel' },
  { value: 'VC', labelKey: 'wizard.investmentSources.vc' },
  { value: 'Bank', labelKey: 'wizard.investmentSources.bank' },
  { value: 'Grant', labelKey: 'wizard.investmentSources.grant' },
  { value: 'Own', labelKey: 'wizard.investmentSources.own' },
  { value: 'Other', labelKey: 'wizard.investmentSources.other' },
] as const;

export const FOUNDER_ROLES = [
  { value: 'CEO', labelKey: 'wizard.founderRoles.ceo' },
  { value: 'CTO', labelKey: 'wizard.founderRoles.cto' },
  { value: 'COO', labelKey: 'wizard.founderRoles.coo' },
  { value: 'CFO', labelKey: 'wizard.founderRoles.cfo' },
  { value: 'CMO', labelKey: 'wizard.founderRoles.cmo' },
  { value: 'Other', labelKey: 'wizard.founderRoles.other' },
] as const;

export const COUNTRIES_EN = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia',
  'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Ethiopia',
  'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Hungary',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Kyrgyzstan',
  'Latvia', 'Lebanon', 'Lithuania', 'Malaysia', 'Mexico', 'Moldova',
  'Mongolia', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
  'Oman', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia',
  'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Tajikistan', 'Thailand', 'Tunisia', 'Turkey', 'Turkmenistan',
  'UAE', 'UK', 'Ukraine', 'USA', 'Uzbekistan', 'Vietnam', 'Other',
] as const;

const COUNTRY_LOOKUP = new Map(COUNTRIES_EN.map(c => [c.toLowerCase(), c]));

export const formatCountryName = (raw?: string): string => {
  if (!raw) return '';
  return COUNTRY_LOOKUP.get(raw.toLowerCase()) || raw.charAt(0).toUpperCase() + raw.slice(1);
};

const COUNTRY_ISO2: Record<string, string> = {
  afghanistan: 'AF', albania: 'AL', algeria: 'DZ', argentina: 'AR', armenia: 'AM',
  australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bahrain: 'BH', bangladesh: 'BD',
  belarus: 'BY', belgium: 'BE', brazil: 'BR', bulgaria: 'BG', cambodia: 'KH',
  canada: 'CA', chile: 'CL', china: 'CN', colombia: 'CO', croatia: 'HR',
  'czech republic': 'CZ', denmark: 'DK', egypt: 'EG', estonia: 'EE', ethiopia: 'ET',
  finland: 'FI', france: 'FR', georgia: 'GE', germany: 'DE', ghana: 'GH',
  greece: 'GR', hungary: 'HU', india: 'IN', indonesia: 'ID', iran: 'IR',
  iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP',
  jordan: 'JO', kazakhstan: 'KZ', kenya: 'KE', kuwait: 'KW', kyrgyzstan: 'KG',
  latvia: 'LV', lebanon: 'LB', lithuania: 'LT', malaysia: 'MY', mexico: 'MX',
  moldova: 'MD', mongolia: 'MN', morocco: 'MA', netherlands: 'NL',
  'new zealand': 'NZ', nigeria: 'NG', norway: 'NO', oman: 'OM', pakistan: 'PK',
  peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT', qatar: 'QA',
  romania: 'RO', russia: 'RU', 'saudi arabia': 'SA', serbia: 'RS',
  singapore: 'SG', slovakia: 'SK', slovenia: 'SI', 'south africa': 'ZA',
  'south korea': 'KR', spain: 'ES', 'sri lanka': 'LK', sweden: 'SE',
  switzerland: 'CH', tajikistan: 'TJ', thailand: 'TH', tunisia: 'TN',
  turkey: 'TR', turkmenistan: 'TM',
  uae: 'AE', 'united arab emirates': 'AE',
  uk: 'GB', 'united kingdom': 'GB', gb: 'GB',
  ukraine: 'UA',
  usa: 'US', 'united states': 'US', us: 'US',
  uzbekistan: 'UZ', vietnam: 'VN',
};

const iso2ToFlag = (iso2: string): string => {
  const base = 0x1f1e6; // regional indicator 'A'
  const code = iso2.toUpperCase();
  if (code.length !== 2) return '\u{1F30D}';
  return String.fromCodePoint(base + (code.charCodeAt(0) - 65), base + (code.charCodeAt(1) - 65));
};

export const getCountryFlag = (country?: string): string => {
  if (!country) return '\u{1F30D}';
  const iso2 = COUNTRY_ISO2[country.trim().toLowerCase()] || (country.length === 2 ? country : '');
  return iso2 ? iso2ToFlag(iso2) : '\u{1F30D}';
};

export const STATUS_OPTIONS = ['new', 'in_review', 'pipeline', 'portfolio'] as const;

export const MAX_TEAM_MEMBERS = 100;
export const MAX_INVESTMENTS = 5;
