/**
 * Projects shown on the Foellinger Auditorium screen. Edit freely.
 * Links are optional: buttons only appear for valid http(s) URLs.
 */
export interface Project {
  id: string
  title: string
  /** "Role" or "Program", shown before `affiliation`. Leave both out for personal projects. */
  affiliationLabel?: 'Role' | 'Program'
  affiliation?: string
  status: 'In progress' | 'Completed'
  /** One or more short paragraphs. */
  description: readonly string[]
  stack: readonly string[]
  /** Optional bullet list, e.g. planned features for a project in progress. */
  features?: { title: string; items: readonly string[] }
  links?: { github?: string; demo?: string }
}

export const PROJECTS: readonly Project[] = [
  {
    id: 'nobe',
    title: 'NOBE Membership Management SaaS',
    affiliationLabel: 'Role',
    affiliation: 'NOBE Tech Committee Software Developer',
    status: 'In progress',
    description: [
      'Building a multi-tenant SaaS membership platform that helps student organizations manage attendance, member points, absence requests, and infractions.',
      'My technical work includes designing a Supabase PostgreSQL database schema and implementing row-level security to separate data between organizations.',
    ],
    stack: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Docker', 'GitHub Actions'],
  },
  {
    id: 'face-attendance',
    title: 'Facial Recognition Attendance System',
    status: 'In progress',
    description: [
      'Currently developing a Python-based attendance management system that uses computer vision and facial recognition to automate attendance tracking. The project aims to capture live webcam footage, identify individuals by comparing facial features against stored reference images, and automatically record attendance with dates and timestamps.',
      "Through this project, I'm exploring practical applications of computer vision, facial recognition, and automated data processing while strengthening my Python programming skills.",
    ],
    stack: ['Python', 'OpenCV', 'face_recognition', 'NumPy', 'CSV'],
    features: {
      title: 'Planned features',
      items: [
        'Real-time webcam capture and facial recognition',
        'Facial encoding and comparison with reference images',
        'Automated attendance tracking with timestamps',
        'CSV-based attendance record management',
      ],
    },
  },
  {
    id: 'skincare',
    title: 'Personalized Skincare Recommender',
    affiliationLabel: 'Program',
    affiliation: 'Dev Ada',
    status: 'Completed',
    description: [
      'Developed a skincare recommendation website that helps users discover products based on their skin concerns, active ingredients, and budget.',
    ],
    stack: ['HTML', 'JavaScript', 'Python'],
  },
  {
    id: 'werewolf',
    title: 'Werewolf Kill',
    affiliationLabel: 'Program',
    affiliation: 'CS 124 Honors',
    status: 'Completed',
    description: [
      'Collaborated on an online multiplayer social deduction game inspired by Werewolf.',
      'The project included real-time multiplayer functionality and voice chat.',
    ],
    stack: ['React Native', 'JavaScript', 'Firebase', 'Agora RTC SDK', 'Figma'],
  },
]

/** True only for absolute http(s) URLs — anything else gets no button. */
export function isValidUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
