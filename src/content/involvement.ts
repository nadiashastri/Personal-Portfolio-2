/**
 * Experience & Involvement content shown at the Illini Union's mini Quad Day.
 * Edit freely — booths, cards and the work board all read from here.
 */

export type BoothProp = 'laptop' | 'flyers' | 'trifold' | 'notebooks'
export type OrgIcon = 'database' | 'gear' | 'megaphone' | 'code'

export interface Organization {
  id: 'nobe' | 'swe' | 'ambassadors' | 'wcs'
  name: string
  /** Short name painted on the booth and shown as the card badge. */
  short: string
  role: string
  dates: string
  description: readonly string[]
  skills: readonly string[]
  /** Booth/card accent colours (decorative, not official branding). */
  colors: { primary: string; secondary: string; ink: string }
  icon: OrgIcon
  /** Signature prop on the booth table. */
  prop: BoothProp
}

export const ORGANIZATIONS: readonly Organization[] = [
  {
    id: 'nobe',
    name: 'National Organization for Business and Engineering',
    short: 'NOBE',
    role: 'Tech Committee Software Developer',
    dates: 'Fall 2026–present',
    description: [
      "I'm working with NOBE's Technology Committee to build a multi-tenant SaaS membership management platform for student organizations.",
      'The platform is designed to help organizations track event attendance, member points, absence requests, and infractions.',
      'My work includes designing a Supabase PostgreSQL database schema and row-level security policies to separate organization data.',
    ],
    skills: ['Software development', 'Database design', 'TypeScript', 'Supabase', 'Teamwork'],
    colors: { primary: '#0f6b6b', secondary: '#7fc8c0', ink: '#ffffff' },
    icon: 'database',
    prop: 'laptop',
  },
  {
    id: 'swe',
    name: 'Society of Women Engineers',
    short: 'SWE',
    role: 'Tech Committee Events Chair',
    dates: 'Fall 2026–present',
    description: [
      'I help coordinate and execute hands-on technical workshops and engineering events that give members opportunities to develop practical skills and explore different areas of engineering.',
    ],
    skills: ['Event planning', 'Technical communication', 'Leadership', 'Collaboration'],
    colors: { primary: '#e2a72e', secondary: '#13294b', ink: '#13294b' },
    icon: 'gear',
    prop: 'flyers',
  },
  {
    id: 'ambassadors',
    name: 'Illinois Engineering Ambassadors',
    short: 'EA',
    role: 'Engineering Ambassador',
    dates: 'Fall 2026–present',
    description: [
      'I lead interactive STEM workshops and communicate engineering concepts to K–12 students, with an emphasis on reaching students who may have limited exposure to engineering opportunities.',
      'I also use assertion-evidence communication techniques to make technical presentations engaging and understandable.',
    ],
    skills: ['Public speaking', 'STEM outreach', 'Mentorship', 'Communication'],
    colors: { primary: '#e8590c', secondary: '#13294b', ink: '#ffffff' },
    icon: 'megaphone',
    prop: 'trifold',
  },
  {
    id: 'wcs',
    name: 'Women in Computer Science',
    short: 'WCS',
    role: 'Explorations Committee Member',
    dates: 'Fall 2025–Spring 2026',
    description: [
      'I helped organize community-building and programming events to support students interested in computer science.',
      'I also supported the planning of Code Ada Hackathon and Dev Ada, a semester-long collaborative programming initiative.',
    ],
    skills: ['Event coordination', 'Teamwork', 'Community building', 'Communication'],
    colors: { primary: '#6d48b0', secondary: '#f2c6e0', ink: '#ffffff' },
    icon: 'code',
    prop: 'notebooks',
  },
]

export interface WorkExperience {
  title: string
  employer: string
  dates: string
  description: string
}

export const WORK_EXPERIENCE: readonly WorkExperience[] = [
  {
    title: 'Lifeguard & Swim Instructor',
    employer: 'Village of Orland Park',
    dates: 'May 2021–August 2025',
    description:
      'Worked across four summers in a public safety role, monitored aquatic areas, taught swimming, and communicated with patrons.',
  },
  {
    title: 'Retail Associate',
    employer: 'Urban Outfitters',
    dates: 'June–August 2026',
    description: 'Provided customer service, helped customers find products, and offered personalized recommendations.',
  },
  {
    title: 'Medical Assistant',
    employer: 'Priority One Healthcare',
    dates: 'August 2023',
    description:
      'Assisted with administrative tasks, patient interactions, appointment scheduling, and basic clinical support responsibilities.',
  },
]
