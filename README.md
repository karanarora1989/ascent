# Ascent - AI-Powered Product Management Platform

A mobile-first, chat-based product management platform for lending companies. Built with Next.js, Supabase, and Anthropic Claude AI.

## 🚀 Features

### Core Workflows
- **Ideas** - Chat-based idea capture with AI assistance
- **Backlog** - TrueProblem AI for impact hypothesis stress-testing
- **Spec Writer** - TrueSpec AI for collaborative PRD writing
- **Execution** - Status tracking and capability ingestion
- **Analytics** - Proactive insights and chat-with-data

### AI-Powered
- **TrueProblem** - Challenges impact hypotheses, demands quantitative evidence
- **TrueRank** - Automated prioritization with compliance-first rules
- **TrueSpec** - Guided PRD writing with structured prompts
- **Insights** - Natural language analytics queries

### Mobile-First Design
- Bottom navigation for easy thumb access
- Chat interfaces for all AI workflows
- Card-based layouts
- Optimized for mobile screens

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: Anthropic Claude (Sonnet 4)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd ascent
```

2. **Install dependencies**
```bash
npm install --legacy-peer-deps
```

3. **Set up environment variables**

Create `.env.local` file:
```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key
```

4. **Set up Supabase database**

Run the schema file:
```bash
# Connect to your Supabase project and run:
psql -h <your-db-host> -U postgres -d postgres -f lib/supabase/schema_single_tenant.sql
```

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ascent/
├── app/
│   ├── api/              # API routes
│   │   ├── ai/chat/      # AI streaming endpoint
│   │   ├── squads/       # Squad management
│   │   └── work-items/   # Work item CRUD
│   ├── dashboard/        # Main app pages
│   │   ├── ideas/        # Ideas page
│   │   ├── backlog/      # Backlog + TrueProblem
│   │   ├── spec/         # Spec writer + TrueSpec
│   │   ├── execution/    # Execution tracking
│   │   ├── analytics/    # Analytics + Insights
│   │   └── admin/        # Admin panel
│   └── pending-approval/ # User approval page
├── components/           # Reusable components
│   ├── BottomNav.tsx     # Mobile bottom navigation
│   ├── ChatInterface.tsx # AI chat UI
│   └── TopBar.tsx        # Page header
├── hooks/
│   └── useAIChat.ts      # AI chat hook
├── lib/
│   ├── anthropic/        # AI client & prompts
│   └── supabase/         # Database client & schema
└── middleware.ts         # Auth & approval middleware
```

## 🎯 Key Concepts

### Single-Tenant Architecture
- All data in `ascent_org_demo` schema
- No multi-tenancy complexity
- Simplified for MVP

### User Approval Flow
1. User signs up with Clerk
2. Middleware checks approval status
3. Unapproved users see pending page
4. Admin approves/rejects in Admin panel

### Work Item Lifecycle
```
idea → backlog → prioritized → spec_done → ingested → live
```

### AI System Prompts
- **TrueProblem**: Stress-tests impact hypotheses
- **TrueRank**: Prioritizes with compliance-first rules
- **TrueSpec**: Guides PRD writing
- **Insights**: Answers analytics questions

## 🔧 Configuration

### Clerk Setup
1. Create Clerk application
2. Enable email/password auth
3. Copy API keys to `.env.local`

### Supabase Setup
1. Create Supabase project
2. Run schema SQL file
3. Copy connection details to `.env.local`
4. Enable Row Level Security (RLS) if needed

### Anthropic Setup
1. Get API key from Anthropic Console
2. Add to `.env.local`
3. Model: `claude-sonnet-4-20250514`

## 📱 Mobile Optimization

- Bottom navigation (7 tabs)
- Full-height layouts
- Scrollable content areas
- Touch-optimized buttons
- Safe area support for iOS

## 🚦 Development

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for product teams
