export interface NavLink {
  name: string;
  href: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link: string;
  timeframe: string;
}

export interface CaseStudyStat {
  label: string;
  value: string;
}

export interface CaseStudyHighlight {
  icon: string;
  title: string;
  desc: string;
}

export interface CaseStudyItem {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  duration: string;
  team: string;
  stats: CaseStudyStat[];
  highlights: CaseStudyHighlight[];
}

export interface Experience {
  role: string;
  company: string;
  period: string;
}

export interface PersonalItem {
  icon: string;
  text: string;
}

export interface AboutStat {
  value: number;
  suffix: string;
  label: string;
}

export interface SocialLink {
  name: string;
  icon: string;
  href: string;
}

export interface SiteContent {
  nav: {
    links: NavLink[];
  };
  hero: {
    title: string;
    subtitle: string;
  };
  projects: {
    headingLead: string;
    headingHighlight: string;
    subtitle: string;
    viewProject: string;
    viewAll: string;
    items: ProjectItem[];
  };
  caseStudies: {
    headingLead: string;
    headingHighlight: string;
    subtitle: string;
    readMore: string;
    items: CaseStudyItem[];
  };
  about: {
    headingLead: string;
    headingHighlight: string;
    location: string;
    bio1: string;
    bio2: string;
    philosophyTitle: string;
    philosophyQuote: string;
    skillsTitle: string;
    skills: string[];
    experienceTitle: string;
    experiences: Experience[];
    personal: PersonalItem[];
    badgeLabel: string;
    badgeValue: string;
    portrait: string;
    portraitAlt: string;
    stats: AboutStat[];
  };
  contact: {
    headingLead: string;
    headingHighlight: string;
    subtitle: string;
    nameLabel: string;
    emailLabel: string;
    projectTypeLabel: string;
    messageLabel: string;
    submitLabel: string;
    submittedLabel: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    messagePlaceholder: string;
    projectTypeDefault: string;
    projectTypeOptions: { value: string; label: string }[];
    altContactText: string;
    email: string;
    social: SocialLink[];
    quickLinks: NavLink[];
  };
  footer: {
    copyright: string;
    madeWithPre: string;
    madeWithPost: string;
    links: NavLink[];
  };
  arcatext: ArcatextContent;
  conversant: ConversantContent;
  usaa: UsaaContent;
  memberHome: MemberHomeContent;
  /**
   * Maps each project-page content key (e.g. "arcatext") to the Google Doc ID
   * whose "Project Page" tab mirrors it. Consumed by the external doc-sync
   * Apps Script (tools/sync-project-docs.gs), not the site itself. Add one
   * entry per new project page so the sync picks it up automatically.
   */
  projectDocs?: Record<string, string>;
}

export interface TitledItem {
  title: string;
  desc: string;
}

export interface ArcatextFlow {
  title: string;
  steps: string[];
  desc: string;
}

export interface ArcatextDecision {
  n: string;
  title: string;
  desc: string;
}

export interface ArcatextInsight {
  title: string;
  desc: string;
  response: string;
}

export interface ArcatextResponse {
  insight: string;
  response: string;
}

export interface ArcatextQuestion {
  n: string;
  q: string;
}

export interface ArcatextContent {
  backToPortfolio: string;
  brand: string;
  toc: string[];
  /** Persisted display order of section ids (e.g. "sec-01"), set by admin "Move". */
  sectionOrder?: string[];
  hero: {
    status: string;
    title: string;
    subtitle: string;
    typeTags: string[];
    roleLabel: string;
    roleValue: string;
    platformLabel: string;
    platformValue: string;
    surfaceLabel: string;
    surfaceValue: string;
  };
  overview: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    productTypeLabel: string;
    productTypeList: string[];
    originTitle: string;
    origin: string[];
    readingWritingTitle: string;
    readingWriting: string[];
    roleTitle: string;
    role: string[];
  };
  problem: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    opportunityEyebrow: string;
    opportunityLead: string;
    opportunityHighlight: string;
    problemsTitle: string;
    problems: TitledItem[];
    opportunitiesTitle: string;
    opportunities: TitledItem[];
    closing: string[];
  };
  strategy: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    second: string[];
    quoteLead: string;
    quoteHighlight: string;
    cards: TitledItem[];
    artifactEyebrow: string;
    artifactTitle: string;
    artifact: string[];
    aiEyebrow: string;
    aiTitle: string;
    ai: string[];
  };
  productSystem: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    flows: ArcatextFlow[];
    closing: string[];
  };
  decisions: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: ArcatextDecision[];
  };
  execution: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    discoveryTitle: string;
    discovery: string[];
    synthesisTitle: string;
    synthesis: string[];
    directionalTitle: string;
    directionalInsights: ArcatextInsight[];
    soWhatLabel: string;
    soWhatLead: string;
    soWhatHighlight: string;
    soWhat: string[];
    insightToResponseTitle: string;
    productResponses: ArcatextResponse[];
    competitiveTitle: string;
    competitive: string[];
    shippedTitle: string;
    outcomes: TitledItem[];
    launchEyebrow: string;
    launchLead: string;
    launchHighlight: string;
    launch: string[];
    launchQuestions: ArcatextQuestion[];
    plannedSignalsLabel: string;
    launchSignals: string[];
  };
  caseStudies: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: { title: string; question: string }[];
  };
  footerCta: {
    titleLead: string;
    titleHighlight: string;
    titleRest: string;
    getInTouch: string;
    backToProjects: string;
  };
}

export interface ConversantInsight {
  insight: string;
  response: string;
}

export interface ConversantWork {
  title: string;
  desc: string[];
}

export interface ConversantContent {
  backToPortfolio: string;
  brand: string;
  toc: string[];
  /** Persisted display order of section ids (e.g. "sec-01"), set by admin "Move". */
  sectionOrder?: string[];
  hero: {
    status: string;
    title: string;
    subtitle: string;
    typeTags: string[];
    roleLabel: string;
    roleValue: string;
    platformLabel: string;
    platformValue: string;
    surfaceLabel: string;
    surfaceValue: string;
  };
  overview: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    productTypeLabel: string;
    productTypeList: string[];
    roleTitle: string;
    roleList: string[];
    usersLabel: string;
    usersList: string[];
    workstreamsLabel: string;
    workstreamsList: string[];
  };
  challenge: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    hmwLabel: string;
    hmwLead: string;
    hmwHighlight: string;
    intro: string[];
    contextTitle: string;
    context: string[];
  };
  discovery: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    processLabel: string;
    processSteps: string[];
    responsesTitle: string;
    responses: ConversantInsight[];
  };
  strategy: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    pillars: TitledItem[];
    quoteLead: string;
    quoteHighlight: string;
  };
  productSystem: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    models: UsaaFlowModel[];
    closing: string[];
  };
  selectedWork: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: ConversantWork[];
  };
  decisions: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: UsaaDecision[];
  };
  constraints: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    constraintsTitle: string;
    items: TitledItem[];
    collaborationTitle: string;
    collaboration: string[];
    collaboratorsLabel: string;
    collaborators: string[];
  };
  validation: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    questionsTitle: string;
    questions: UsaaQuestion[];
  };
  impact: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    highlights: string[];
    demonstratesTitle: string;
    demonstrates: string[];
    caseStudiesTitle: string;
    caseStudies: { title: string; question: string }[];
    confidentiality: string;
  };
  footerCta: {
    titleLead: string;
    titleHighlight: string;
    titleRest: string;
    getInTouch: string;
    backToProjects: string;
  };
}

export interface UsaaFlowModel {
  title: string;
  flow: string;
  desc: string;
}

export interface UsaaDecision {
  n: string;
  title: string;
  desc: string;
  tradeoff: string;
}

export interface UsaaResponse {
  insight: string;
  requirement: string;
  response: string;
}

export interface UsaaQuestion {
  n: string;
  q: string;
}

export interface UsaaContent {
  backToPortfolio: string;
  brand: string;
  toc: string[];
  /** Persisted display order of section ids (e.g. "sec-01"), set by admin "Move". */
  sectionOrder?: string[];
  hero: {
    status: string;
    title: string;
    subtitle: string;
    typeTags: string[];
    roleLabel: string;
    roleValue: string;
    platformLabel: string;
    platformValue: string;
    surfaceLabel: string;
    surfaceValue: string;
  };
  overview: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    productTypeLabel: string;
    productTypeList: string[];
    roleTitle: string;
    roleList: string[];
  };
  challenge: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    hmwLabel: string;
    hmwLead: string;
    hmwHighlight: string;
    intro: string[];
    contextTitle: string;
    context: string[];
  };
  discovery: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    insights: TitledItem[];
    responsesTitle: string;
    responses: UsaaResponse[];
  };
  strategy: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    quoteLead: string;
    quoteHighlight: string;
  };
  productSystem: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    models: UsaaFlowModel[];
    closing: string[];
  };
  decisions: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: UsaaDecision[];
  };
  execution: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    blocks: TitledItem[];
  };
  validation: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    inputsLabel: string;
    inputs: string[];
    questionsTitle: string;
    questions: UsaaQuestion[];
  };
  impact: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    demonstratesTitle: string;
    demonstrates: string[];
    caseStudiesTitle: string;
    caseStudies: { title: string; question: string }[];
    confidentiality: string;
  };
  footerCta: {
    titleLead: string;
    titleHighlight: string;
    titleRest: string;
    getInTouch: string;
    backToProjects: string;
  };
}

export interface MemberHomeContent {
  backToPortfolio: string;
  brand: string;
  toc: string[];
  /** Persisted display order of section ids (e.g. "sec-01"), set by admin "Move". */
  sectionOrder?: string[];
  hero: {
    status: string;
    title: string;
    subtitle: string;
    typeTags: string[];
    roleLabel: string;
    roleValue: string;
    platformLabel: string;
    platformValue: string;
    surfaceLabel: string;
    surfaceValue: string;
  };
  overview: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    productTypeLabel: string;
    productTypeList: string[];
    roleTitle: string;
    roleList: string[];
    statsLabel: string;
    stats: HeroStat[];
  };
  challenge: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    hmwLabel: string;
    hmwLead: string;
    hmwHighlight: string;
    intro: string[];
    contextTitle: string;
    context: string[];
  };
  discovery: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    insights: TitledItem[];
    responsesTitle: string;
    responses: UsaaResponse[];
  };
  strategy: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    pillars: TitledItem[];
    quoteLead: string;
    quoteHighlight: string;
  };
  productSystem: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    models: UsaaFlowModel[];
    closing: string[];
  };
  decisions: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    items: UsaaDecision[];
  };
  execution: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    blocks: TitledItem[];
  };
  validation: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    inputsLabel: string;
    inputs: string[];
    questionsTitle: string;
    questions: UsaaQuestion[];
  };
  impact: {
    eyebrow: string;
    titleLead: string;
    titleHighlight: string;
    intro: string[];
    highlights: string[];
    demonstratesTitle: string;
    demonstrates: string[];
    caseStudiesTitle: string;
    caseStudies: { title: string; question: string }[];
    confidentiality: string;
  };
  footerCta: {
    titleLead: string;
    titleHighlight: string;
    titleRest: string;
    getInTouch: string;
    backToProjects: string;
  };
}
