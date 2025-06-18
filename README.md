# Alotth.com

## Architecture

### Core Technologies

- Next.js (Latest)
- Supabase (Database and Authentication)
- Markdown for content
- Theme system for visualization

### Project Structure

```
alotth.com/
├── app/                    # Next.js main directory
│   ├── page.tsx           # Home page (under construction)
│   ├── admin/             # Admin area (protected)
│   │   ├── layout.tsx    # Layout with authentication check
│   │   ├── page.tsx      # Main dashboard
│   │   ├── login/        # Admin login page
│   │   │   └── page.tsx  # Login form
│   │   └── proposals/    # Proposals management
│   └── proposals/         # Public proposals view
├── components/            # Reusable components
│   ├── MarkdownRenderer.tsx # Markdown renderer with themes
│   └── auth/             # Authentication components
│       ├── LoginForm.tsx # Login form component
│       └── AuthGuard.tsx # Route protection component
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase configuration
│   │   ├── config.ts     # Client configuration
│   │   └── auth.ts       # Authentication functions
│   └── themes/           # Theme configurations (defined in code)
└── types/                # TypeScript type definitions
```

### Core Features

1. **Authentication**

   - Email/password login
   - Initially deactivated accounts
   - Manual activation via Supabase
   - Admin route protection
   - Automatic login redirection

2. **Proposals CMS**

   - Create and edit proposals in Markdown
   - Storage in Supabase
   - Unique link sharing system
   - Public proposal viewing

3. **Theme System**
   - Predefined themes in code:
     - Default
     - Gamer
     - Business
     - Fun
   - Each theme defines styles for:
     - Containers
     - Headings
     - Paragraphs
     - Lists
     - Links
     - Code blocks
     - Blockquotes
     - Tables

### Data Model (Supabase)

```sql
-- Proposals Table
proposals
  - id: uuid
  - title: string
  - content: text (markdown)
  - theme_id: string (reference to theme ID defined in code)
  - created_at: timestamp
  - updated_at: timestamp
  - share_key: string
  - is_active: boolean
```

## Environment Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

3. Configure Supabase:

- Create project in Supabase
- Add credentials to .env.local
- Run initial migrations

4. Start development:

```bash
npm run dev
```

5. Update data types

```bash
npx supabase gen types typescript --project-id "your-project-id" --schema public > types/supabase.ts
```

## TODO

- [ ] Implement a more abstract CMS system (proposals or pages)
- [ ] Add node types (e.g., proposal as a type with connections)
- [ ] Add file attachments to nodes
- [ ] Implement node search functionality
- [ ] Add node filtering capabilities
- [ ] Implement node sorting
- [ ] Add node pagination
