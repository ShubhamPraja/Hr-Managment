export type ModuleRole = 'Admin' | 'HR' | 'Employee';

export type ModuleStatus = 'In Progress' | 'Planned';
export type ModulePriority = 'P0' | 'P1' | 'P2';
export type ModuleCategory = 'Talent' | 'Experience' | 'Operations' | 'Governance' | 'Intelligence';

export const HR_MODULE_PATHS = [
  '/recruitment',
  '/onboarding',
  '/performance',
  '/learning',
  '/helpdesk',
  '/documents',
  '/expenses',
  '/workforce',
  '/compliance',
  '/engagement',
] as const;

export type HRModulePath = (typeof HR_MODULE_PATHS)[number];

export type HRModuleId =
  | 'recruitment'
  | 'onboarding'
  | 'performance'
  | 'learning'
  | 'helpdesk'
  | 'documents'
  | 'expenses'
  | 'workforce'
  | 'compliance'
  | 'engagement';

export type HRModuleConfig = {
  id: HRModuleId;
  path: HRModulePath;
  title: string;
  navLabel: string;
  icon: string;
  category: ModuleCategory;
  priority: ModulePriority;
  status: ModuleStatus;
  roles: ModuleRole[];
  description: string;
  outcomes: string[];
  keyWorkflows: string[];
  launchMetrics: string[];
};

export const HR_MODULE_CATALOG: Record<HRModuleId, HRModuleConfig> = {
  recruitment: {
    id: 'recruitment',
    path: '/recruitment',
    title: 'Recruitment and ATS',
    navLabel: 'Recruitment',
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    category: 'Talent',
    priority: 'P0',
    status: 'In Progress',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Manage requisitions, sourcing, interview pipelines, and offer workflows in one hiring system.',
    outcomes: [
      'Reduce time-to-hire with structured pipeline stages',
      'Improve hiring quality via scorecards and calibration',
      'Maintain candidate communication SLAs and employer brand',
    ],
    keyWorkflows: [
      'Requisition request and approval',
      'Job posting and source tracking',
      'Interview scheduling and feedback capture',
      'Offer approval and pre-boarding handoff',
    ],
    launchMetrics: ['Time to fill', 'Offer acceptance rate', 'Source quality index', 'Interview-to-offer ratio'],
  },
  onboarding: {
    id: 'onboarding',
    path: '/onboarding',
    title: 'Onboarding and Offboarding',
    navLabel: 'Onboarding',
    icon: 'M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z',
    category: 'Experience',
    priority: 'P0',
    status: 'In Progress',
    roles: ['Admin', 'HR'],
    description:
      'Standardize day-zero readiness, document collection, provisioning tasks, and clean exit processes.',
    outcomes: [
      'Faster new-hire productivity with pre-boarding checklists',
      'Less risk with mandatory document and policy sign-off',
      'Secure exits with access revocation and knowledge handover',
    ],
    keyWorkflows: [
      'Welcome packet and e-sign completion',
      'IT, payroll, and manager task orchestration',
      '30-60-90 onboarding checkpoints',
      'Exit interview, clearance, and alumni status',
    ],
    launchMetrics: [
      'Day-1 readiness score',
      'Onboarding completion rate',
      'Average onboarding cycle time',
      'Offboarding SLA adherence',
    ],
  },
  performance: {
    id: 'performance',
    path: '/performance',
    title: 'Performance and Goals',
    navLabel: 'Performance',
    icon: 'M3 17l6-6 4 4 8-8M14 7h7v7',
    category: 'Talent',
    priority: 'P1',
    status: 'In Progress',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Align individual goals to business priorities with regular check-ins, feedback, and review cycles.',
    outcomes: [
      'Clear goal visibility from company to individual level',
      'Continuous feedback instead of yearly-only appraisals',
      'More objective decisions for promotions and rewards',
    ],
    keyWorkflows: [
      'Goal setting and quarterly refresh',
      '1:1 check-ins with coaching notes',
      'Self, peer, and manager feedback',
      'Performance cycle calibration and closure',
    ],
    launchMetrics: [
      'Goal completion rate',
      'Check-in adoption rate',
      'Review completion on time',
      'Top performer retention',
    ],
  },
  learning: {
    id: 'learning',
    path: '/learning',
    title: 'Learning and Skills',
    navLabel: 'Learning',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12.083 12.083 0 0112 20.055a12.084 12.084 0 01-6.16-9.477L12 14z',
    category: 'Talent',
    priority: 'P1',
    status: 'In Progress',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Build a skills-based workforce with compliance training, personalized learning paths, and certification tracking.',
    outcomes: [
      'Close skill gaps faster with role-based learning paths',
      'Stay audit-ready for mandatory training requirements',
      'Increase internal mobility through skill visibility',
    ],
    keyWorkflows: [
      'Course catalog and learning path assignment',
      'Mandatory compliance training campaigns',
      'Certification expiry alerts and renewals',
      'Skills profile updates from completed learning',
    ],
    launchMetrics: ['Training completion rate', 'Compliance overdue count', 'Skill coverage by role', 'Learning NPS'],
  },
  helpdesk: {
    id: 'helpdesk',
    path: '/helpdesk',
    title: 'HR Helpdesk and Cases',
    navLabel: 'Helpdesk',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    category: 'Operations',
    priority: 'P1',
    status: 'In Progress',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Centralize HR requests with ticketing, SLA tracking, knowledge base, and secure employee communication.',
    outcomes: [
      'Faster resolution with clear ownership and SLA timers',
      'Lower repetitive queries via searchable HR knowledge base',
      'Stronger employee trust through transparent case tracking',
    ],
    keyWorkflows: [
      'Multi-channel case intake',
      'Auto-routing by policy category and urgency',
      'SLA escalation and breach alerts',
      'Knowledge article suggestion before ticket creation',
    ],
    launchMetrics: ['First response time', 'Mean time to resolution', 'SLA breach rate', 'Case deflection rate'],
  },
  documents: {
    id: 'documents',
    path: '/documents',
    title: 'Document and e-Sign',
    navLabel: 'Documents',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586A2 2 0 0114 3.586L18.414 8A2 2 0 0119 9.414V19a2 2 0 01-2 2z',
    category: 'Governance',
    priority: 'P0',
    status: 'In Progress',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Securely manage contracts, policy acknowledgements, and employee records with version control and signatures.',
    outcomes: [
      'Single source of truth for employee documents',
      'Lower compliance risk with audit-ready policy acknowledgements',
      'Faster onboarding and policy rollouts using e-sign',
    ],
    keyWorkflows: [
      'Template-based document generation',
      'Role-based document access and visibility',
      'E-signatures and acknowledgement trails',
      'Expiry reminders for contracts and certifications',
    ],
    launchMetrics: ['Document completion rate', 'Policy acknowledgement rate', 'Expired document count', 'Audit prep time'],
  },
  expenses: {
    id: 'expenses',
    path: '/expenses',
    title: 'Expenses and Reimbursements',
    navLabel: 'Expenses',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
    category: 'Operations',
    priority: 'P2',
    status: 'Planned',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Digitize expense claims with policy validation, approvals, and payroll-linked reimbursement cycles.',
    outcomes: [
      'Shorter reimbursement cycles and fewer manual checks',
      'Policy-controlled approvals and spend visibility',
      'Accurate payouts through payroll integration',
    ],
    keyWorkflows: [
      'Mobile expense claim with receipts',
      'Policy checks and exception flags',
      'Manager and finance approval chain',
      'Reimbursement export to payroll',
    ],
    launchMetrics: ['Average reimbursement cycle', 'Policy violation rate', 'Rejected claim ratio', 'Unreimbursed backlog'],
  },
  workforce: {
    id: 'workforce',
    path: '/workforce',
    title: 'Workforce Planning',
    navLabel: 'Workforce',
    icon: 'M3 3v18h18M7 16V8m5 8V5m5 11v-3',
    category: 'Intelligence',
    priority: 'P1',
    status: 'In Progress',
    roles: ['Admin', 'HR'],
    description:
      'Plan headcount, skills, and costs using scenarios aligned with financial and business targets.',
    outcomes: [
      'Predict hiring gaps before they impact delivery',
      'Align headcount decisions with budget constraints',
      'Enable scenario planning for growth and attrition risk',
    ],
    keyWorkflows: [
      'Department-level headcount planning',
      'FTE and cost scenario modeling',
      'Capacity planning by skills and project demand',
      'Variance tracking against approved plans',
    ],
    launchMetrics: ['Headcount variance', 'Vacancy risk score', 'Planned vs actual labor cost', 'Critical role coverage'],
  },
  compliance: {
    id: 'compliance',
    path: '/compliance',
    title: 'Compliance and Controls',
    navLabel: 'Compliance',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    category: 'Governance',
    priority: 'P0',
    status: 'In Progress',
    roles: ['Admin', 'HR'],
    description:
      'Track policy adherence, statutory obligations, and audit trails across attendance, payroll, and leave.',
    outcomes: [
      'Lower legal and financial exposure from missed obligations',
      'Stronger audit readiness with immutable change history',
      'Central compliance view across people operations',
    ],
    keyWorkflows: [
      'Compliance calendar for key due dates',
      'Automated statutory report generation',
      'Policy exception capture and remediation',
      'Audit logs for employee lifecycle changes',
    ],
    launchMetrics: ['Open compliance risks', 'Missed filing count', 'Audit finding closure time', 'Policy breach frequency'],
  },
  engagement: {
    id: 'engagement',
    path: '/engagement',
    title: 'Engagement and Recognition',
    navLabel: 'Engagement',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    category: 'Experience',
    priority: 'P2',
    status: 'Planned',
    roles: ['Admin', 'HR', 'Employee'],
    description:
      'Measure sentiment, recognize contributions, and close feedback loops to improve retention and culture.',
    outcomes: [
      'Early detection of morale and retention risk',
      'Higher participation in recognition programs',
      'Data-backed actions from pulse surveys and feedback',
    ],
    keyWorkflows: [
      'Pulse surveys and eNPS campaigns',
      'Peer-to-peer recognition feed',
      'Manager action planning on survey results',
      'Engagement trend monitoring by team and location',
    ],
    launchMetrics: ['eNPS trend', 'Recognition participation', 'Survey response rate', 'Regrettable attrition rate'],
  },
};

export const HR_MODULE_NAV_ITEMS = Object.values(HR_MODULE_CATALOG).map((moduleConfig) => ({
  path: moduleConfig.path,
  label: moduleConfig.navLabel,
  icon: moduleConfig.icon,
  roles: moduleConfig.roles,
}));
