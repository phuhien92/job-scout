import type { Profile, RemotePreference } from "@/lib/working-memory/types";

/**
 * Deterministic, evidence-only extraction. Every field comes from text that
 * actually appears in the source resume; anything that cannot be read with
 * confidence stays empty rather than guessed. No experience is invented.
 *
 * This is the fact layer the Optimize rewrite will fact-gate against, and the
 * hard-blocker (location / remote) fields the Jobs split view will read.
 */

const HEADING_TO_SECTION: Record<string, string> = {
  skills: "skills",
  "technical skills": "skills",
  "technical skill": "skills",
  "skills & expertise": "skills",
  "skills and expertise": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  "key skills": "skills",
  "skills summary": "skills",
  "technical skills & tools": "skills",
  "technical skills and tools": "skills",
  technologies: "skills",
  technology: "skills",
  "tech stack": "skills",
  tools: "skills",
  "tools & technologies": "skills",
  "tools and technologies": "skills",
  expertise: "skills",
  "areas of expertise": "skills",
  "technical expertise": "skills",
  "professional skills": "skills",
  "professional competencies": "skills",
  "programming languages": "skills",
  "programming languages & tools": "skills",
  "programming skills": "skills",
  "languages & tools": "skills",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  "employment history": "experience",
  "work history": "experience",
  "career history": "experience",
  "professional history": "experience",
  "work & experience": "experience",
  "work and experience": "experience",
  "related experience": "experience",
  "experience & projects": "experience",
  "experience and projects": "experience",
  "experience summary": "experience",
  "relevant experience": "experience",
  "leadership experience": "experience",
  "selected projects and experience": "experience",
  education: "education",
  "education & certifications": "education",
  "education and certifications": "education",
  "academic background": "education",
  "education & training": "education",
  "education and training": "education",
  summary: "summary",
  "professional summary": "summary",
  profile: "summary",
  "professional profile": "summary",
  "summary of qualifications": "summary",
  "qualifications summary": "summary",
  "career summary": "summary",
  about: "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  "professional objective": "summary",
  "executive summary": "summary",
  "professional highlights": "summary",
  highlights: "summary",
  projects: "projects",
  "selected projects": "projects",
  "project experience": "projects",
  "personal projects": "projects",
  "academic projects": "projects",
  "key projects": "projects",
  "featured projects": "projects",
  "side projects": "projects",
  certifications: "certifications",
  certificates: "certifications",
  certification: "certifications",
  "licenses & certifications": "certifications",
  "licenses and certifications": "certifications",
  licenses: "certifications",
  licences: "certifications",
  courses: "certifications",
  training: "certifications",
  "certifications & awards": "certifications",
  "certifications and awards": "certifications",
  awards: "certifications",
  "awards & honors": "certifications",
  "awards and honors": "certifications",
  honors: "certifications",
  honours: "certifications",
  languages: "languages",
  language: "languages",
  contact: "contact",
  "contact information": "contact",
  "contact details": "contact",
  "connect with me": "contact",
  publications: "other",
  conferences: "other",
  talks: "other",
  speaking: "other",
  patents: "other",
  affiliations: "other",
  memberships: "other",
  references: "other",
  "additional information": "other",
  "additional info": "other",
  volunteering: "other",
  volunteer: "other",
  activities: "other",
  "leadership & activities": "other",
  "leadership and activities": "other",
  interests: "other",
  hobbies: "other",
  "interests & hobbies": "other",
  "interests and hobbies": "other",
  extracurricular: "other",
};

const ROLE_KEYWORDS = [
  "software engineer",
  "software developer",
  "frontend engineer",
  "front-end engineer",
  "frontend developer",
  "front-end developer",
  "front end developer",
  "backend engineer",
  "back-end engineer",
  "backend developer",
  "full stack",
  "full-stack",
  "fullstack",
  "web developer",
  "web engineer",
  "react developer",
  "react.js developer",
  "next.js developer",
  "node.js developer",
  "mobile engineer",
  "mobile developer",
  "ios engineer",
  "android engineer",
  "react native developer",
  "devops engineer",
  "site reliability engineer",
  "platform engineer",
  "infrastructure engineer",
  "cloud engineer",
  "systems engineer",
  "network engineer",
  "security engineer",
  "qa engineer",
  "test engineer",
  "automation engineer",
  "quality engineer",
  "data engineer",
  "data scientist",
  "machine learning engineer",
  "ml engineer",
  "ai engineer",
  "data analyst",
  "business analyst",
  "analytics engineer",
  "product manager",
  "product owner",
  "project manager",
  "program manager",
  "technical program manager",
  "engineering manager",
  "engineering lead",
  "tech lead",
  "technical lead",
  "engineering director",
  "head of engineering",
  "director of engineering",
  "product designer",
  "ux designer",
  "ui designer",
  "product design lead",
  "brand designer",
  "visual designer",
  "graphic designer",
  "motion designer",
  "design manager",
  "content designer",
  "marketing manager",
  "product marketing manager",
  "product marketing",
  "growth manager",
  "account manager",
  "customer success manager",
  "support engineer",
  "technical writer",
  "devrel engineer",
  "developer relations",
  "solutions architect",
  "software architect",
  "scrum master",
  "product operations",
  "product ops",
  "operations manager",
  "sales engineer",
  "senior engineer",
  "senior developer",
  "lead engineer",
  "lead developer",
  "engineering intern",
  "software intern",
  "intern",
  "internship",
  "founder",
  "co-founder",
  "engineer",
  "developer",
  "designer",
  "analyst",
  "manager",
  "director",
  "architect",
  "consultant",
  "scientist",
  "researcher",
  "producer",
  "editor",
  "strategist",
  "specialist",
] as const;

const ROLE_REGEXES = ROLE_KEYWORDS.map((keyword) => ({
  keyword,
  regex: roleRegex(keyword),
}));

const NON_ROLE_FIRST_WORDS = new Set([
  "led", "lead", "built", "created", "owned", "managed", "designed", "developed",
  "founded", "spearheaded", "drove", "implemented", "launched", "delivered",
  "architected", "established", "initiated", "improved", "reduced", "increased",
  "grew", "optimized", "shipped", "oversaw", "coordinated", "mentored", "hired",
  "responsible", "assisted", "supported", "collaborated", "worked", "as a",
]);

const SENIORITY_CUES: Array<{ label: string; regex: RegExp }> = [
  { label: "Senior", regex: /\bsenior\b|\bsr\.?\b/i },
  { label: "Staff", regex: /\bstaff\b/i },
  { label: "Principal", regex: /\bprincipal\b/i },
  { label: "Lead", regex: /\blead\b/i },
  { label: "Head", regex: /\bhead\b/i },
  { label: "Director", regex: /\b(vice president|vp|svp|director)\b/i },
  { label: "Manager", regex: /\bmanager\b/i },
  { label: "Junior", regex: /\b(junior|jr\.?|entry.?level)\b/i },
  { label: "Executive", regex: /\b(c-?level|cto|coo|cfo|ceo|executive)\b/i },
];

const TARGET_ROLE_TAXONOMY: Array<{ label: string; keywords: RegExp }> = [
  {
    label: "Frontend engineer",
    keywords: /(front\s?end|frontend|front-end)\s*(engineer|developer)|react(\s?\.?js)?\s*developer|next\.?js\s*developer|web\s*(developer|engineer)|ui\s*developer/iu,
  },
  {
    label: "Backend engineer",
    keywords: /(back\s?end|backend|back-end)\s*(engineer|developer)/iu,
  },
  {
    label: "Full-stack engineer",
    keywords: /full[-\s]?stack|fullstack/iu,
  },
  {
    label: "Mobile engineer",
    keywords: /mobile\s*(engineer|developer)|ios\s*engineer|android\s*engineer|react\s*native\s*(developer|engineer)/iu,
  },
  {
    label: "DevOps engineer",
    keywords: /devops|site\s*reliability|sre|platform\s*engineer|infrastructure\s*engineer|cloud\s*engineer/iu,
  },
  {
    label: "QA engineer",
    keywords: /(qa|quality|test|automation)\s*engineer/iu,
  },
  {
    label: "Security engineer",
    keywords: /security\s*engineer/iu,
  },
  {
    label: "Data engineer",
    keywords: /data\s*engineer/iu,
  },
  {
    label: "Data scientist",
    keywords: /data\s*scientist/iu,
  },
  {
    label: "Machine learning engineer",
    keywords: /machine\s*learning\s*engineer|ml\s*engineer|ai\s*engineer/iu,
  },
  {
    label: "Data analyst",
    keywords: /data\s*analyst|business\s*analyst|analytics\s*engineer/iu,
  },
  {
    label: "Product manager",
    keywords: /product\s*manager|product\s*owner|program\s*manager|technical\s*program\s*manager/iu,
  },
  {
    label: "Project manager",
    keywords: /project\s*manager/iu,
  },
  {
    label: "Engineering manager",
    keywords: /engineering\s*manager|engineering\s*lead|tech\s*lead|technical\s*lead|staff\s*engineer|principal\s*engineer|director\s*of\s*engineering|head\s*of\s*engineering/iu,
  },
  {
    label: "Product designer",
    keywords: /product\s*designer|ux\s*designer|ui\s*designer|brand\s*designer|visual\s*designer|design\s*manager/iu,
  },
  {
    label: "Software engineer",
    keywords: /software\s*(engineer|developer)|full\s*stack|fullstack|web\s*(developer|engineer)|engineer|developer/iu,
  },
];

const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Swift", "Kotlin", "Ruby",
  "PHP", "Scala", "Dart", "GraphQL", "SQL", "Bash", "Shell", "PowerShell", "Perl",
  "Objective-C", "Elixir", "Clojure", "Haskell", "Groovy", "Rust", "C++", "C#",
  "React", "React.js", "React Native", "Next.js", "Vue", "Vue.js", "Nuxt", "Angular",
  "Svelte", "Redux", "Zustand", "Tailwind CSS", "Tailwind", "CSS", "CSS3", "HTML",
  "HTML5", "jQuery", "Webpack", "Vite", "Babel", "Node.js", "Express", "NestJS",
  "Django", "Flask", "Spring Boot", "Spring", "Ruby on Rails", "Rails", "Laravel",
  "ASP.NET", ".NET Core", "FastAPI", "Phoenix", "PostgreSQL", "MySQL", "MongoDB",
  "Redis", "DynamoDB", "SQLite", "Oracle", "SQL Server", "BigQuery", "Snowflake",
  "Redshift", "Elasticsearch", "Kafka", "RabbitMQ", "Spark", "Hadoop", "Airflow",
  "dbt", "Databricks", "Cassandra", "ClickHouse", "AWS", "Azure", "GCP",
  "Google Cloud", "Cloudflare", "Vercel", "Netlify", "Heroku", "Docker",
  "Kubernetes", "K8s", "Terraform", "Ansible", "Jenkins", "GitHub Actions",
  "GitLab CI", "CircleCI", "Prometheus", "Grafana", "Datadog", "Sentry",
  "Nginx", "Linux", "Unix", "Serverless", "Lambda", "EC2", "S3", "Helm",
  "Jest", "Cypress", "Playwright", "Mocha", "Chai", "Vitest", "Testing Library",
  "RSpec", "JUnit", "pytest", "Selenium", "TestCafe", "Flutter", "Expo",
  "PyTorch", "TensorFlow", "Keras", "scikit-learn", "pandas", "NumPy", "OpenCV",
  "LangChain", "Hugging Face", "MLflow", "Jupyter", "Git", "GitHub", "GitLab",
  "Bitbucket", "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator",
  "Tableau", "Power BI", "Looker", "MATLAB", "Unity",
].map((skill) => ({ skill, regex: namedPhraseRegex(skill) }));

const KNOWN_CITIES = new Set([
  "New York", "San Francisco", "Seattle", "Austin", "Los Angeles", "Boston",
  "Chicago", "Denver", "Miami", "Atlanta", "Portland", "San Diego", "Phoenix",
  "Dallas", "Houston", "Philadelphia", "Washington", "Salt Lake City", "Minneapolis",
  "Nashville", "Charlotte", "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa",
  "London", "Berlin", "Paris", "Amsterdam", "Dublin", "Sydney", "Melbourne",
  "Singapore", "Tokyo", "Osaka", "Hanoi", "Ho Chi Minh City", "Da Nang", "Can Tho",
  "Hai Phong", "Bangkok", "Kuala Lumpur", "Manila", "Jakarta", "Mumbai", "Bangalore",
  "Zurich", "Geneva", "Munich", "Hamburg", "Copenhagen", "Stockholm", "Oslo",
  "Helsinki", "Barcelona", "Madrid", "Milan", "Lisbon", "Prague", "Vienna",
  "Warsaw", "Budapest", "Dubai", "Tel Aviv", "Reykjavik", "Auckland", "Wellington",
  "Perth", "Brisbane", "Seoul", "Taipei", "Shanghai", "Beijing", "Hong Kong",
]);

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR",
]);

const CA_PROVINCE_CODES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

const COUNTRY_CODES = new Set([
  "US", "UK", "GB", "VN", "SG", "DE", "FR", "NL", "CA", "AU", "NZ", "JP", "IN",
  "CN", "AE", "CH", "IE", "SE", "NO", "DK", "FI", "PT", "ES", "IT", "AT", "BE",
  "PL", "CZ", "HU", "RO", "BG", "GR", "HR", "UA", "IL", "TH", "MY", "PH", "ID",
  "MX", "BR", "AR", "CL", "CO", "KR", "TW", "HK",
]);

const COUNTRY_NAMES = new Set([
  "United States", "United Kingdom", "Vietnam", "Singapore", "Germany", "France",
  "Netherlands", "Australia", "Canada", "Japan", "South Korea", "Switzerland",
  "Spain", "Italy", "India", "China", "Denmark", "Sweden", "Norway", "Ireland",
  "Portugal", "Poland", "Czech Republic", "Belgium", "Austria", "Brazil", "Mexico",
  "Argentina", "Philippines", "Thailand", "Malaysia", "Indonesia", "New Zealand",
  "Hong Kong", "Taiwan", "Ukraine", "Romania", "Hungary", "Finland", "Luxembourg",
  "Israel", "Turkey", "South Africa", "Egypt",
]);

const STAGE_REGIONS = new Set([...US_STATE_CODES, ...CA_PROVINCE_CODES]);

const CONTACT_WORD_RE = /\b(email|phone|mobile|call|linkedin|github|portfolio|website|resume|address|linked|skype)\b/i;
const EDUCATION_WORD_RE = /\b(university|college|school|institute|bachelor|master|phd|b\.s\.?|b\.a\.?|m\.s\.?|m\.b\.a\.?|degree|diploma|academy)\b/i;

const ROLE_CLEANUPS: RegExp[] = [
  /\s+at\s+.+$/i,
  /\s+@\s*.+$/,
  /\s*[-–—|]\s*(remote|hybrid|on-?site|full-?time|part-?time|contract|intern|co-?op|temporary|consultant|freelance)\s*$/i,
  /[({[].*[)}\]]\s*$/,
  /,\s*[^,]+$/,
  /\s+in\s+[^\s,.]+(?:\s*,\s*[^\s,]+)?$/,
];

const LEADING_VERB_RE = new RegExp(`^(?:${[...NON_ROLE_FIRST_WORDS].join("|")})\\b`, "i");

const DATE_RANGE_RE =
  /(?:[a-z]{3,9}\.?\s+)?\d{4}\s*[-–—~]\s*(?:[a-z]{3,9}\.?\s+)?(?:present|current|now|\d{4})\b/gi;

interface SectionContext {
  sectionOf: (index: number) => string;
  headingIndexes: number[];
  trim: string[];
}

export function extractProfile(text: string): Profile {
  const lines = text.split("\n");
  const trim = lines.map((line) => line.trim());
  const context = buildSectionContext(trim);

  const headerEnd = context.headingIndexes.length > 0 ? context.headingIndexes[0] : trim.length;

  const name = extractName(context, headerEnd);
  const skills = extractSkills(context, text);
  const titles = extractTitles(context, headerEnd);
  const locations = extractLocations(context, headerEnd);
  const remotePreference = extractRemotePreference(context, headerEnd);
  const summary = extractSummary(context, headerEnd);
  const seniority = extractSeniority(text);
  const targetRoles = extractTargetRoles(titles);

  return {
    name,
    skills,
    titles,
    locations,
    remotePreference,
    seniority,
    summary,
    targetRoles,
    targetRole: "",
    targetIndustry: "",
  };
}

export function isHeadingLine(line: string): boolean {
  return HEADING_TO_SECTION[normalizeHeading(line)] !== undefined;
}

function buildSectionContext(trim: string[]): SectionContext {
  const byIndex = new Map<number, string>();
  const headingIndexes: number[] = [];
  let current: string | null = null;
  for (let i = 0; i < trim.length; i += 1) {
    const heading = normalizeHeading(trim[i]);
    if (heading) {
      const key = HEADING_TO_SECTION[heading];
      if (key) {
        current = key;
        headingIndexes.push(i);
        continue;
      }
    }
    byIndex.set(i, current ?? "header");
  }
  return {
    sectionOf: (index: number): string => byIndex.get(index) ?? "header",
    headingIndexes,
    trim,
  };
}

function normalizeHeading(line: string): string {
  if (!line) return "";
  let value = line.replace(/[*_#`]/g, "");
  value = value.replace(/^\s*(?:[\-–—•·▪‣◦>]|\d+[.)]|\d{1,2}\s+)+\s*/, "");
  value = value.replace(/\s*\([^)]*\)\s*$/, "");
  value = value.replace(/:+$/, "");
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractName(context: SectionContext, headerEnd: number): string {
  const { trim } = context;
  const limit = Math.min(headerEnd, 12);
  for (let i = 0; i < limit; i += 1) {
    const line = trim[i];
    if (!line) continue;
    if (line.includes("|")) {
      const candidate = line
        .split("|")
        .map((part) => part.trim())
        .find((part) => isNameCandidate(part));
      if (candidate) return candidate;
      continue;
    }
    if (isNameCandidate(line)) return line;
  }
  return "";
}

function isNameCandidate(line: string): boolean {
  const value = line.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!value) return false;
  if (value.length > 45) return false;
  if (value.includes(",")) return false;
  if (normalizeHeading(value) && HEADING_TO_SECTION[normalizeHeading(value)]) return false;
  if (/\d/.test(value)) return false;
  if (value.includes("@") || value.includes("http") || value.includes("www.")) return false;
  if (CONTACT_WORD_RE.test(value)) return false;
  if (EDUCATION_WORD_RE.test(value)) return false;
  if (/\b(remote|hybrid|on-?site)\b/i.test(value)) return false;
  if (ROLE_REGEXES.some(({ regex }) => regex.test(value))) return false;
  if (CITY_OR_COUNTRY.has(value)) return false;
  const words = value.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  const connectorRe = /^(de|van|der|den|la|le|y|and|della|da|di)$/i;
  for (const word of words) {
    if (word.length < 2) return false;
    if (!/^\p{Lu}[\p{L}.'-]*$/u.test(word) && !connectorRe.test(word)) {
      return false;
    }
  }
  return true;
}

function extractSkills(context: SectionContext, text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const maybeAdd = (value: string) => {
    const clean = cleanSkillToken(value);
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    out.push(clean);
  };

  const { trim, sectionOf } = context;
  for (let i = 0; i < trim.length; i += 1) {
    if (sectionOf(i) !== "skills") continue;
    for (const part of splitOnSkillSeparators(trim[i])) {
      maybeAdd(part);
    }
  }

  for (const { skill, regex } of KNOWN_SKILLS) {
    if (regex.test(text)) maybeAdd(skill);
  }

  return out.slice(0, 60);
}

function splitOnSkillSeparators(line: string): string[] {
  const segments = line.replace(/\s+[##]\s*/g, " • ").split(/[,|•·‣▪;#]/);
  const out: string[] = [];
  for (const segment of segments) {
    const value = segment.trim();
    if (!value) continue;
    const parts = value.split("/");
    const slashSplit =
      parts.length > 1 && parts.every((part) => part.trim().length >= 3 && /^\p{L}/u.test(part.trim()));
    if (slashSplit) {
      out.push(...parts.map((part) => part.trim()));
      continue;
    }
    out.push(value);
  }
  return out;
}

function cleanSkillToken(token: string): string {
  let value = token.trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value)) return "";
  value = value.replace(/\s*\([^)]*\)\s*/g, "");
  value = value.replace(/[:#]/g, "");
  value = value.trim();
  if (!value) return "";
  if (/^(and|the|a|an|or|of)$/i.test(value)) return "";
  if (/^\W+$/.test(value)) return "";
  if (value.length > 48) return "";
  return value;
}

function extractTitles(context: SectionContext, headerEnd: number): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();
  const { trim, sectionOf } = context;

  const maybeAdd = (candidate: string) => {
    const clean = cleanTitle(candidate);
    if (!clean || seen.has(clean.toLowerCase())) return;
    if (EDUCATION_WORD_RE.test(clean) || CONTACT_WORD_RE.test(clean)) return;
    if (KNOWN_CITIES.has(clean) || COUNTRY_NAMES.has(clean)) return;
    if (!ROLE_REGEXES.some(({ regex }) => regex.test(clean))) return;
    if (LEADING_VERB_RE.test(clean)) return;
    seen.add(clean.toLowerCase());
    titles.push(clean);
  };

  const scanLine = (line: string) => {
    const stripped = stripBullet(line);
    if (!stripped) return;
    if (isHeadingLine(stripped)) return;
    if (EDUCATION_WORD_RE.test(stripped)) return;
    if (/^\S+@\S+\.\S+/.test(stripped)) return;
    const roleSegments = stripped.split(/[|•·‣▪]|\s+[-–—]\s+/);
    for (const segment of roleSegments) {
      const candidate = segment.trim();
      if (!candidate) continue;
      const words = candidate.replace(DATE_RANGE_RE, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      if (words.length === 0 || words.length > 6) continue;
      if (ROLE_REGEXES.some(({ regex }) => regex.test(candidate))) {
        maybeAdd(candidate);
      }
    }
  };

  const eligible = new Set(["experience", "projects"]);
  for (let i = 0; i < Math.min(headerEnd, trim.length); i += 1) {
    scanLine(trim[i]);
  }
  for (let i = 0; i < trim.length; i += 1) {
    const section = sectionOf(i);
    if (section === "header" || !eligible.has(section)) continue;
    scanLine(trim[i]);
  }

  return titles.slice(0, 12);
}

function cleanTitle(title: string): string {
  let value = title.replace(DATE_RANGE_RE, " ");
  value = value.replace(/[\u{200B}-\u{200D}\uFEFF]/gu, "");
  let previous: string;
  do {
    previous = value;
    for (const cleanup of ROLE_CLEANUPS) {
      value = value.replace(cleanup, "");
    }
    value = value.replace(/\s+/g, " ").trim();
  } while (value !== previous && value.length > 0);
  value = value.replace(/^[\s.,\-–—|:;]+|[\s.,\-–—|:;]+$/g, "");
  return value;
}

function stripBullet(line: string): string {
  return line
    .replace(/^\s*(?:[\-–—•·▪‣◦>])+\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .trim();
}

function extractLocations(context: SectionContext, headerEnd: number): string[] {
  const { trim, sectionOf, headingIndexes } = context;

  const lines: string[] = [];
  for (let i = 0; i < Math.min(headerEnd, trim.length); i += 1) {
    const line = trim[i];
    if (line) lines.push(line);
  }
  for (let i = 0; i < headingIndexes.length; i += 1) {
    const start = headingIndexes[i] + 1;
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : trim.length;
    if (sectionOf(start) !== "contact") continue;
    for (let j = start; j < end; j += 1) {
      const line = trim[j];
      if (line) lines.push(line);
    }
  }
  const text = lines.join("\n");

  const found: string[] = [];
  const seen = new Set<string>();

  const maybeAdd = (value: string) => {
    const clean = value.replace(/[,.]+$/, "").trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    if (/\bremote\b/i.test(clean)) return;
    if (CONTACT_WORD_RE.test(clean) || EDUCATION_WORD_RE.test(clean)) return;
    if (clean.length > 60) return;
    seen.add(clean.toLowerCase());
    found.push(clean);
  };

  const segments = text.split(/[\n|•·‣▪]|\s+[-–—]\s+|\s+\/\s+/);

  const regionRe = /\b([A-Z][\p{L}.'\- ]{1,50}?)\s*,?\s+([A-Z]{2})\b/gu;
  let match: RegExpExecArray | null;
  for (const seg of segments) {
    let m: RegExpExecArray | null;
    regionRe.lastIndex = 0;
    while ((m = regionRe.exec(seg)) !== null) {
      const city = m[1].trim();
      const code = m[2].toUpperCase();
      if (!STAGE_REGIONS.has(code) && !COUNTRY_CODES.has(code)) continue;
      if (ROLE_REGEXES.some(({ regex }) => regex.test(city))) continue;
      maybeAdd(`${city}, ${code}`);
    }
  }

  const countryRe = new RegExp(
    `\\b([A-Z][\\p{L}.'\\- ]{1,50}?)\\s*,\\s*(${[...COUNTRY_NAMES].join("|")})\\b`,
    "g",
  );
  for (const seg of segments) {
    countryRe.lastIndex = 0;
    while ((match = countryRe.exec(seg)) !== null) {
      const city = match[1].trim();
      if (ROLE_REGEXES.some(({ regex }) => regex.test(city))) continue;
      maybeAdd(`${city}, ${match[2]}`);
    }
  }

  const areaRe = /\b(Greater\s+[A-Z][\p{L}]+.?s?\s+Area|[A-Z][\p{L}]+(?:[\p{L} ]*?)Bay\s+Area)\b/gu;
  while ((match = areaRe.exec(text)) !== null) {
    maybeAdd(match[1]);
  }

  for (const city of KNOWN_CITIES) {
    const cityRe = namedPhraseRegex(city);
    if (!cityRe.test(text)) continue;
    let covered = false;
    for (const existing of found) {
      if (existing === city || existing.startsWith(`${city},`) || existing.endsWith(` ${city}`)) {
        covered = true;
        break;
      }
    }
    if (!covered) maybeAdd(city);
  }

  return found.slice(0, 20);
}

function extractRemotePreference(context: SectionContext, headerEnd: number): RemotePreference {
  const { trim, sectionOf, headingIndexes } = context;
  const contextLines: string[] = [];
  for (let i = 0; i < Math.min(headerEnd, trim.length); i += 1) {
    const line = trim[i];
    if (line && !isHeadingLine(line)) contextLines.push(line.toLowerCase());
  }
  for (let i = 0; i < headingIndexes.length; i += 1) {
    const start = headingIndexes[i] + 1;
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : trim.length;
    if (sectionOf(start) !== "summary") continue;
    for (let j = start; j < end; j += 1) {
      const line = trim[j];
      if (line) contextLines.push(line.toLowerCase());
    }
    break;
  }

  const ctx = "\n" + contextLines.join("\n") + "\n";

  const remoteExplicit =
    /(fully remote|100%? remote|remote-?first|remote only|open to remote|prefers? remote|remote (position|role|work|job)|remote-?only|work(?:s|ing)? from home|\bwfh\b|telecommute)/i.test(
      ctx,
    ) ||
    /(?:^|\n)\s*(?:[\-–—•·▪‣◦>]|\d+[.)])?\s*(?:open\s+to\s+)?remote(?:[\s,|·•;&]|$)/i.test(ctx) ||
    /\| remote(?:[\s,|·•;&]|$)/i.test(ctx) ||
    /remote [|·•;]\s*$/i.test(ctx);

  if (remoteExplicit) return "remote";

  if (
    /\bhybrid\b/i.test(ctx) ||
    /\b\d+\s*days?\s*(?:in|at|on)\s*[-\s]*(?:the\s+)?office\b/i.test(ctx)
  ) {
    return "hybrid";
  }

  if (
    /\bon-?site\b/i.test(ctx) ||
    /\b(?:in|at)\s*(?:the\s+)?office\b/i.test(ctx) ||
    /\bfully\s+in\s*(?:the\s+)?office\b/i.test(ctx) ||
    /\b5\s*days?\s*(?:in|at|on)\s*(?:the\s+)?office\b/i.test(ctx)
  ) {
    return "onsite";
  }

  return null;
}

function extractSummary(context: SectionContext, headerEnd: number): string {
  const { trim, sectionOf, headingIndexes } = context;

  for (let i = 0; i < headingIndexes.length; i += 1) {
    const start = headingIndexes[i] + 1;
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : trim.length;
    if (sectionOf(start) !== "summary") continue;
    const lines: string[] = [];
    for (let j = start; j < end; j += 1) {
      const line = stripBullet(trim[j]);
      if (!line) continue;
      if (lines.length > 0 && /\d{4}|\bco\.?\b|\binc\.?\b|\bllc\b/i.test(line)) break;
      lines.push(line);
    }
    if (lines.length > 0) return joinSummary(lines);
  }

  let best = "";
  for (let i = 0; i < Math.min(headerEnd, trim.length); i += 1) {
    const line = stripBullet(trim[i]);
    if (!line || line.length < 60) continue;
    if (/\d{4}/.test(line) || line.includes("@")) continue;
    const words = line.split(" ").filter(Boolean).length;
    if (words < 12) continue;
    if (line.length > best.length) best = line;
  }
  return joinSummary([best]);
}

function joinSummary(lines: string[]): string {
  return lines
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/^\s*[-–—•·▪‣]\s*/, "")
    .trim()
    .slice(0, 1000);
}

function extractSeniority(text: string): string[] {
  const out: string[] = [];
  for (const cue of SENIORITY_CUES) {
    if (cue.regex.test(text)) out.push(cue.label);
  }
  return out;
}

function extractTargetRoles(titles: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    for (const taxonomy of TARGET_ROLE_TAXONOMY) {
      if (!taxonomy.keywords.test(title)) continue;
      if (!seen.has(taxonomy.label)) {
        seen.add(taxonomy.label);
        out.push(taxonomy.label);
      }
      break;
    }
  }
  return out.slice(0, 6);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roleRegex(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "iu");
}

function namedPhraseRegex(name: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "iu");
}

const CITY_OR_COUNTRY = new Set([...KNOWN_CITIES, ...COUNTRY_NAMES]);