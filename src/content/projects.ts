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
      'Building a SaaS multi-tenant membership platform enabling student groups to log event attendance, monitor member points, process absence requests, and track infractions.',
      'Transforming NOBE internal attendance tools into a customizable, standalone product suitable for external student group implementation.',
      'Architecting a Supabase PostgreSQL relational database schema with row-level security policies to partition multi-tenant user and organization data.',
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
    id: 'llm-from-scratch',
    title: 'Large Language Model from Scratch',
    status: 'In progress',
    description: [
      'Currently developing a large language model (LLM) from scratch using Python to gain a deeper understanding of the mathematical foundations and computational architecture behind modern artificial intelligence. The project focuses on implementing core concepts in natural language processing, including tokenization, embeddings, neural networks, and transformer architectures.',
      "Through this project, I'm exploring how language models learn patterns from textual data, generate predictions, and use attention mechanisms to process contextual information. My goal is to strengthen my understanding of deep learning while gaining hands-on experience with the algorithms and mathematical principles that power generative AI.",
    ],
    stack: ['Python', 'PyTorch', 'NumPy'],
    features: {
      title: 'Planned features',
      items: [
        'Text tokenization and data preprocessing',
        'Neural network and transformer architecture implementation',
        'Self-attention mechanisms and positional embeddings',
        'Model training, evaluation, and text generation',
      ],
    },
  },
  {
    id: 'werewolf',
    title: 'Werewolf Kill — Online Multiplayer Social Deduction Game',
    affiliationLabel: 'Program',
    affiliation: 'CS 124 Honors',
    status: 'Completed',
    description: [
      'Collaborated on the development of Werewolf Kill, an interactive online multiplayer adaptation of the classic social deduction game Werewolf, as part of the CS 124 Honors program at the University of Illinois Urbana-Champaign.',
      "The game brings players together in real-time sessions where they are assigned hidden roles, including villagers, werewolves, and special characters. Players navigate alternating day and night phases, using strategy, communication, and teamwork to identify opponents and achieve their team's objectives.",
      'Built using React Native and Firebase, the application supports synchronized multiplayer gameplay, role assignments, voting, and in-game messaging. We also integrated the Agora RTC SDK to enable real-time voice communication, including channel-based voice rooms and microphone controls.',
      "My contributions included designing the game's user interface in Figma and working with the team on implementing interactive features and voice communication. Through this project, I gained experience with real-time database synchronization, component-based application development, and integrating third-party SDKs into a collaborative software project.",
    ],
    stack: ['React Native', 'JavaScript', 'Firebase Realtime Database', 'Firebase Authentication', 'Agora RTC SDK', 'Figma', 'Vercel'],
    features: {
      title: 'Key features',
      items: [
        'Multiplayer sessions with hidden roles and synchronized game states',
        'Real-time chat, voting, and day/night game progression',
        'Voice communication with microphone controls and game-specific channels',
        'Firebase-based player authentication and data synchronization',
        'Interactive interface designed for dynamic multiplayer gameplay',
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
