# TON AI Agent Website

Production-ready marketing website for TON AI Agent built with Next.js 14+, TypeScript, and Tailwind CSS.

## Features

- **High-Performance**: Next.js 14+ with App Router and Turbopack
- **Design System**: Complete design tokens, components, and animations
- **SEO Optimized**: Meta tags, Open Graph, structured data
- **Responsive**: Mobile-first design with adaptive breakpoints
- **Accessible**: WCAG 2.1 compliant components
- **Internationalization Ready**: Structure for multi-language support (EN, RU, ZH)

## Pages Implemented

### Core Pages
- `/` - Homepage with all sections (Hero, Value Prop, How It Works, etc.)
- `/product` - Product overview
- `/product/agents` - Autonomous Agents
- `/developers` - Developer Portal
- `/institutional` - Institutional Solutions
- `/ecosystem` - Ecosystem overview
- `/token` - TONAI Token

### Planned Pages
- Product subpages (Strategy Engine, Marketplace, Security, AI Layer, Multi-Agent)
- Developer documentation pages
- Institutional subpages
- Token subpages
- Resources (Blog, Research, Case Studies)
- Security & Compliance
- Legal pages

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS Variables
- **Components**: Custom components + Radix UI primitives
- **Icons**: Custom SVG icons
- **Animations**: CSS animations + Framer Motion (ready)
- **Analytics**: PostHog integration (ready)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Project Structure

```
website/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Homepage
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Global styles + design tokens
│   │   ├── product/          # Product pages
│   │   ├── developers/       # Developer pages
│   │   ├── institutional/    # Institutional pages
│   │   ├── ecosystem/        # Ecosystem pages
│   │   └── token/            # Token pages
│   ├── components/
│   │   ├── ui/               # UI components (Button, Card, Badge, Input)
│   │   ├── layout/           # Layout components (Header, Footer)
│   │   ├── sections/         # Homepage sections
│   │   └── icons/            # Custom SVG icons
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript types
├── public/                   # Static assets
└── package.json
```

## Design System

### Colors
- **Primary**: TON Blue (#0088CC)
- **Secondary**: Deep Navy (#1A1A2E)
- **Accent**: Vibrant Cyan (#00D4FF)
- **Success/Warning/Error**: Semantic colors

### Typography
- **Font**: Inter (Sans) + JetBrains Mono (Code)
- **Scale**: 12px - 72px with responsive adjustments

### Components
- Button (5 variants, 4 sizes)
- Card (4 variants)
- Badge (7 variants)
- Input (with validation)
- Custom icons

## Performance Targets

- Lighthouse Score: > 90
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## Deployment

Designed for deployment on:
- Vercel (recommended)
- Cloudflare Pages
- Any Node.js hosting

## License

MIT License - TON AI Agent Team
