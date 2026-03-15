export interface NavItem {
  label: string;
  href: string;
  description?: string;
  children?: NavItem[];
}

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface Metric {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
  company?: string;
}

export interface Strategy {
  id: string;
  name: string;
  creator: string;
  apy: number;
  winRate: number;
  subscribers: number;
  risk: 'Low' | 'Medium' | 'High';
  category: string;
  description: string;
}

export interface Partner {
  name: string;
  logo: string;
  href?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  image?: string;
  readTime: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}
