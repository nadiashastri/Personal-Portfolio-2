/**
 * Content for the About Me card. Edit freely — the card lays itself out
 * from this data.
 */
export const ABOUT_ME = {
  label: 'Player profile / 01',
  /** Typed out when the card opens; the last character is shown in orange. */
  heading: "Hello, I'm Nadia.",
  description: [
    "I'm a motivated and curious sophomore at the University of Illinois Urbana-Champaign, currently studying in the Grainger College of Engineering. My academic interests lie at the intersection of physics and computer science, particularly in artificial intelligence and machine learning, quantum computing, and computational physics.",
    "I'm fascinated by how mathematical and physical principles can be translated into computational models and technologies that solve complex, real-world problems. Whether it's exploring the possibilities of quantum information or understanding how machine learning can be applied to scientific challenges, I'm driven by a desire to understand not just how technology works, but how it can be developed and applied in meaningful ways.",
    "Beyond the classroom, I've gained hands-on experience through collaborative software development projects, technical organizations, and leadership opportunities. These experiences have strengthened my programming, problem-solving, and communication skills while teaching me the importance of approaching technical challenges from different perspectives.",
    "As I continue exploring my interests, I'm excited to deepen my technical knowledge, contribute to innovative projects, and pursue opportunities that bring together scientific research, software development, and emerging technologies.",
  ],
  educationTitle: 'Education',
  education: [
    {
      school: 'University of Illinois Urbana-Champaign',
      program: 'Engineering Undeclared · Grainger College of Engineering',
      facts: ['GPA 3.85 / 4.0', 'Aug 2025 – present'],
      coursework:
        'Linear Algebra and Computations, Intro Differential Equations, Physics: Mechanics, Physics: Electricity & Magnetism, Intro Computer Science I & II, Discrete Structures',
    },
    {
      school: 'Carl Sandburg High School',
      program: 'Graduated top 1% · Ranked 4 / 758',
      facts: ['GPA 5.03 / 4.0 weighted', 'Aug 2021 – May 2025'],
      coursework: 'Calculus I – III',
    },
  ],
  interestsTitle: 'Areas of Interest',
  interests: [
    'Software engineering',
    'Computational physics',
    'AI & machine learning',
    'Quantum computing',
    'Engineering × business',
  ],
  toolkitTitle: 'Technical Skills',
  skills: [
    { label: 'Programming', items: ['Java', 'C++', 'Python', 'JavaScript', 'HTML'] },
    { label: 'Tools', items: ['Figma', 'React Native', 'Firebase', 'Vercel', 'Agora RTC SDK', 'Supabase'] },
    { label: 'Languages', items: ['English', 'Spanish'] },
  ],
} as const
