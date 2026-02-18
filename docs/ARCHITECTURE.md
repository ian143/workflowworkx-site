# GlueOS System V2.0 — Production Architecture

## 1. Executive Summary

GlueOS V2.0 replaces the fragile V1.0 stack (Google Apps Script + AppSheet + Google Sheets) with a unified, modern web application. The new system eliminates the timeouts, version conflicts, and UI constraints that plagued V1.0 while preserving the core intelligence loop: **Scout → Architect → Ghostwriter → Sweeper**.

### V1.0 Pain Points Resolved

| V1.0 Problem | V2.0 Solution |
|---|---|
| Apps Script timeouts on large files | Background job queue with no execution limits |
| Drive API 404 version conflicts | Direct file processing via server-side libraries |
| AppSheet UI constraints | Custom Next.js dashboard (mobile-first) |
| Data fragmented across Sheets tabs | Single PostgreSQL database |
| Webhook failures (Make.com) | Direct LinkedIn OAuth 2.0 API integration |
| Manual onboarding via Google Gem | Built-in conversational onboarding flow |

---

## 2. Technology Stack

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Next.js 14 (App Router) + Tailwind CSS + shadcn/ui │
│  Mobile-first responsive dashboard                   │
├─────────────────────────────────────────────────────┤
│                    API LAYER                          │
│  Next.js Route Handlers (REST)                       │
│  Server Actions for mutations                        │
├─────────────────────────────────────────────────────┤
│                  BACKGROUND JOBS                     │
│  Inngest (event-driven) or BullMQ                    │
│  File conversion, AI generation, PDF building        │
├─────────────────────────────────────────────────────┤
│                    DATABASE                           │
│  PostgreSQL (via Prisma ORM)                         │
│  Single source of truth for all entities             │
├─────────────────────────────────────────────────────┤
│                  EXTERNAL SERVICES                   │
│  Anthropic Claude API (Ghostwriter/Architect)        │
│  Stripe (Subscriptions)                              │
│  LinkedIn OAuth 2.0 (Publishing)                     │
│  S3/Vercel Blob (File Storage)                       │
├─────────────────────────────────────────────────────┤
│                   DEPLOYMENT                         │
│  Vercel (Edge + Serverless)                          │
│  Vercel Postgres or Neon (DB)                        │
└─────────────────────────────────────────────────────┘
```

### Stack Justification

- **Next.js 14**: Server components reduce client JS. App Router provides clean API routes and layouts. Vercel deployment is zero-config.
- **PostgreSQL + Prisma**: Replaces the 6+ Google Sheets tabs. Prisma gives type-safe queries, migrations, and a visual studio for debugging.
- **Inngest**: Serverless-friendly background jobs. Handles file conversion and AI generation without timeout constraints. Replaces Apps Script triggers.
- **NextAuth.js**: Handles email/password auth with session management. Integrates natively with Prisma.
- **Stripe**: Already in use for payments. Add webhook-based subscription gating to control access.
- **Anthropic Claude API**: Already proven in V1.0 Agentic Engine. Retains the Ghostwriter and Architect prompt chains.

---

## 3. Database Schema

This replaces all Google Sheets tabs (USER_ACCESS, CONTENT_PIPELINE, POST_VARIATIONS, PROJECT_ASSETS, STRATEGIC_TARGETS) with a normalized relational schema.

### Entity Relationship Diagram

```
users ──┬── identity_vaults (1:1)
        ├── projects ──┬── project_files (1:N)
        │              └── pipeline_items ──┬── sparks (1:N)
        │                                   └── post_drafts (1:N) ── carousel_slides (1:N)
        └── strategic_targets (1:N)
```

### Table Definitions

#### `users`
Replaces: USER_ACCESS sheet (auth columns)

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | VARCHAR UNIQUE | Login identifier |
| password_hash | VARCHAR | bcrypt hashed |
| name | VARCHAR | Display name |
| subscription_status | ENUM | `pending_audit`, `active`, `paused`, `cancelled` |
| stripe_customer_id | VARCHAR | Stripe integration |
| stripe_subscription_id | VARCHAR | Stripe integration |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `identity_vaults`
Replaces: IDENTITY_FILE_JSON column in USER_ACCESS

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | UNIQUE — one vault per user |
| vault_data | JSONB | The full Brand Vault v4.1 JSON |
| audit_status | ENUM | `pending`, `passed`, `passed_with_warnings`, `failed` |
| audit_results | TEXT | Detailed audit output |
| version | INT | Tracks vault revisions |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

The `vault_data` JSONB column stores the entire Identity Vault structure:
```json
{
  "voice_dna": {
    "tone_archetype": "...",
    "signature_phrases": [],
    "banned_words": [],
    "emoji_usage": "minimal",
    "ai_slop_triggers": []
  },
  "historical_wins": [
    {
      "project_name": "...",
      "data_bomb": "...",
      "secret_math": "..."
    }
  ],
  "icp": {
    "core_pain_point": "...",
    "decision_maker": "..."
  },
  "verbatim_language": [],
  "content_strategy": {
    "preferred_post_length": "medium_1300_1600",
    "length_in_characters": { "short": 700, "medium": 1500, "long": 2200 },
    "format_preferences": {
      "willing_to_create": ["text", "carousel"],
      "primary_format": "mixed"
    },
    "posting_frequency": "2_5_per_week"
  },
  "industry_context": {
    "primary_industry": "...",
    "writing_guidelines": {
      "appropriate_jargon": [],
      "appropriate_metrics": []
    }
  }
}
```

#### `projects`
Replaces: Subfolder scanning in monitorProjectInboxes()

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| name | VARCHAR | Project name |
| status | ENUM | `uploading`, `processing`, `ready`, `archived` |
| source_folder_url | VARCHAR | Optional link to original Drive folder |
| created_at | TIMESTAMP | |

#### `project_files`
Replaces: PROJECT_ASSETS sheet + recursive file scanning

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| project_id | UUID (FK→projects) | |
| file_name | VARCHAR | Original filename |
| file_type | ENUM | `pdf`, `pptx`, `docx`, `txt`, `image` |
| mime_type | VARCHAR | |
| storage_key | VARCHAR | S3/Blob path |
| extracted_text | TEXT | Converted plain text content |
| file_size_bytes | INT | |
| created_at | TIMESTAMP | |

#### `pipeline_items`
Replaces: CONTENT_PIPELINE sheet

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| project_id | UUID (FK→projects) | |
| status | ENUM | `new`, `scouting`, `sparks_generated`, `drafting`, `ready`, `published`, `error` |
| forensic_brief | TEXT | AI-generated project analysis |
| priority | ENUM | `low`, `medium`, `high` |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `sparks`
Replaces: POST_VARIATIONS sheet (Spark rows)

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| pipeline_item_id | UUID (FK→pipeline_items) | |
| spark_text | VARCHAR | The strategic hook (max 10 words) |
| status | ENUM | `pending`, `approved`, `rejected`, `drafted` |
| sort_order | INT | 1-5 position |
| created_at | TIMESTAMP | |

#### `post_drafts`
Replaces: POST_VARIATIONS sheet (Draft columns)

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| spark_id | UUID (FK→sparks) | |
| length_type | ENUM | `short`, `medium`, `long` |
| content | TEXT | The post body |
| score | INT | AI quality score (0-100) |
| status | ENUM | `draft`, `approved`, `published`, `rejected` |
| published_at | TIMESTAMP | |
| linkedin_post_id | VARCHAR | Returned after publishing |
| created_at | TIMESTAMP | |

#### `carousel_slides`
Replaces: Carousel JSON + Carousel Engine PDF generation

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| post_draft_id | UUID (FK→post_drafts) | |
| slide_number | INT | 1-7 |
| headline | VARCHAR | Slide title |
| content | TEXT | Slide body |
| image_file_id | UUID (FK→project_files) | Optional linked image |

#### `strategic_targets`
Replaces: STRATEGIC_TARGETS sheet

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| target_name | VARCHAR | |
| company | VARCHAR | |
| linkedin_url | VARCHAR | |
| engagement_status | ENUM | `identified`, `engaged`, `converted` |
| notes | TEXT | |
| created_at | TIMESTAMP | |

---

## 4. The Steel Loop (Core Workflow)

The Steel Loop is the heart of GlueOS. It maps directly to the V1.0 agentic pipeline but runs on proper infrastructure.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. SCOUT   │────▶│ 2. ARCHITECT │────▶│3. GHOSTWRITER│────▶│  4. SWEEPER  │
│  (Analysis)  │     │   (Hooks)    │     │  (Drafting)  │     │ (Publishing) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │                     │
  Upload &            Generate 5            Expand spark          Publish to
  Extract            Strategic             into 3 drafts         LinkedIn via
  Data Bombs         Sparks                + 7-slide             OAuth 2.0
                                           carousel
```

### Phase 1: Scout (File Ingestion + Forensic Analysis)

**V1.0 equivalent:** `monitorProjectInboxes()` + `performForensicAnalysis()`

**V2.0 implementation:**
1. User uploads files via drag-and-drop UI (or shares a Drive folder link)
2. Files are stored in S3/Vercel Blob
3. Background job (Inngest) converts each file:
   - **PDF**: Extract text via `pdf-parse`
   - **PPTX**: Extract text via `pptx-parser` or `mammoth`
   - **DOCX**: Extract text via `mammoth`
   - **TXT**: Direct read
   - **Images**: Store for carousel use, optionally OCR
4. Once all files are converted, a second job runs Claude to generate the **Forensic Brief**
5. Pipeline item status moves from `new` → `scouting` → `sparks_generated`

**Key improvement over V1.0:** No more Google Drive API version conflicts. No Apps Script 6-minute timeout. Files process in parallel.

### Phase 2: Architect (Strategic Spark Generation)

**V1.0 equivalent:** `processPipelineItems()`

**V2.0 implementation:**
1. Triggered automatically when Scout completes
2. Loads the user's Identity Vault from database
3. Sends the Forensic Brief + Identity Vault to Claude with the Architect prompt
4. Parses response into 5 Strategic Sparks
5. Sparks are written to `sparks` table with `pending` status
6. User is notified (push notification / email) that sparks are ready for review

### Phase 3: Ghostwriter (Draft Expansion)

**V1.0 equivalent:** `processApprovedSparks()`

**V2.0 implementation:**
1. User approves a spark via the mobile dashboard
2. Spark status changes to `approved`, triggering the Ghostwriter job
3. Claude receives: Identity Vault + Forensic Brief + Approved Hook
4. Generates 3 variations (short/medium/long) + 7-slide carousel JSON
5. All output is validated against the Polyester Test rules:
   - Gary Provost rhythm check (sentence length variance)
   - Banned words filter (from Identity Vault)
   - Data Bomb anchor verification
   - AI slop trigger scan
6. Drafts are stored in `post_drafts` table; carousel slides in `carousel_slides` table
7. If carousel format: background job generates PDF using `@react-pdf/renderer`

### Phase 4: Sweeper (Publishing)

**V1.0 equivalent:** Make.com webhook (replaced)

**V2.0 implementation:**
1. User reviews drafts on dashboard, selects preferred version
2. User approves for publishing
3. System posts directly to LinkedIn via OAuth 2.0 API:
   - Text posts: `POST /v2/ugcPosts`
   - Image/carousel posts: Upload media first, then attach to post
4. LinkedIn post ID is stored back on the `post_drafts` record
5. Status moves to `published`

---

## 5. API Route Design

All API routes live under `/api/` as Next.js Route Handlers.

### Authentication
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/session` | Get current session |

### Identity Vault
| Method | Route | Description |
|---|---|---|
| GET | `/api/vault` | Get current user's vault |
| PUT | `/api/vault` | Update vault JSON |
| POST | `/api/vault/audit` | Run Brand Vault audit |

### Projects & Ingestion
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create new project |
| POST | `/api/projects/[id]/upload` | Upload files to project |
| POST | `/api/projects/[id]/ingest` | Trigger Scout analysis |
| GET | `/api/projects/[id]/files` | List project files |

### Pipeline (Steel Loop)
| Method | Route | Description |
|---|---|---|
| GET | `/api/pipeline` | List pipeline items |
| GET | `/api/pipeline/[id]` | Get pipeline item + sparks |
| GET | `/api/pipeline/[id]/sparks` | List sparks for item |
| POST | `/api/sparks/[id]/approve` | Approve a spark → triggers Ghostwriter |
| POST | `/api/sparks/[id]/reject` | Reject a spark |

### Drafts & Publishing
| Method | Route | Description |
|---|---|---|
| GET | `/api/drafts` | List drafts ready for review |
| GET | `/api/drafts/[id]` | Get draft with carousel slides |
| PUT | `/api/drafts/[id]` | Edit draft content |
| POST | `/api/drafts/[id]/publish` | Publish to LinkedIn |
| GET | `/api/drafts/[id]/carousel` | Get carousel PDF URL |

### Webhooks
| Method | Route | Description |
|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe subscription events |

---

## 6. File Processing Pipeline

The Ingestion Gateway replaces the brittle Google Drive API approach.

```
User Upload ──▶ S3/Blob Storage ──▶ Inngest Job Queue
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              PDF Parser           DOCX Parser            PPTX Parser
             (pdf-parse)          (mammoth)            (pptx-parser)
                    │                     │                     │
                    └─────────────────────┼─────────────────────┘
                                          ▼
                                  extracted_text
                                  stored in DB
                                          │
                                          ▼
                                  Claude Scout Agent
                                  (Forensic Analysis)
                                          │
                                          ▼
                                  pipeline_item.forensic_brief
```

### File Type Support
- **PDF**: `pdf-parse` — fast, reliable text extraction
- **DOCX**: `mammoth` — converts to clean HTML/text, handles formatting
- **PPTX**: `pptx-parser` — extracts slide text and speaker notes
- **TXT**: Direct UTF-8 read
- **Images**: Stored as-is for carousel use. Optional OCR via Claude vision.

### Size Limits
- Max file: 50MB per file
- Max project: 20 files / 200MB total
- Processing timeout: None (background jobs have no hard limit)

---

## 7. AI Prompt Architecture

### The Polyester Test (Quality Gate)

Every AI output passes through a validation layer before being stored:

```typescript
interface PolyesterTestResult {
  passed: boolean;
  scores: {
    rhythmScore: number;      // Gary Provost sentence variance
    slopScore: number;         // AI banned words detected
    dataBombAnchor: boolean;   // References specific project data
    commercialFriction: boolean; // Challenges status quo
    lengthCompliance: boolean; // Matches vault length preferences
  };
  violations: string[];
}
```

### Prompt Chain

Each prompt in the chain receives the Identity Vault as context:

1. **Scout Prompt**: "Perform forensic analysis. Extract Data Bombs and Secret Math."
2. **Architect Prompt**: "Generate 5 Strategic Sparks. Max 10 words. Focus on commercial friction."
3. **Ghostwriter Prompt**: "Expand into 3 variations. Apply Gary Provost rhythm. Anchor to Secret Math."
4. **Sweeper Prompt** (optional): "Final quality check. Verify Polyester Test compliance."

---

## 8. Authentication & Subscription Gating

### Auth Flow
```
Register → Email/Password → Account Created (status: pending_audit)
                                    │
                          Stripe Checkout ──▶ Webhook ──▶ status: active
                                    │
                          Onboarding ──▶ Identity Vault creation
                                    │
                          Brand Vault Audit ──▶ Dashboard unlocked
```

### Subscription Tiers (via Stripe)
- **Setup Fee**: One-time payment (triggers audit)
- **Monthly**: Recurring subscription
- **Gating**: Users without active subscription see a locked dashboard

### Middleware
```typescript
// Every protected route checks:
// 1. Is user authenticated? (NextAuth session)
// 2. Is subscription active? (user.subscription_status === 'active')
// 3. Has Brand Vault passed audit? (vault.audit_status !== 'failed')
```

---

## 9. LinkedIn Publishing Integration

Replaces the Make.com webhook with direct OAuth 2.0.

### OAuth Flow
1. User clicks "Connect LinkedIn" in settings
2. Redirect to LinkedIn OAuth consent screen
3. Callback stores `access_token` and `refresh_token` in database
4. Token refresh handled automatically before publishing

### Publishing Endpoints
- **Text post**: `POST https://api.linkedin.com/v2/ugcPosts`
- **Image upload**: `POST https://api.linkedin.com/v2/assets?action=registerUpload`
- **Carousel**: Upload PDF as document, attach to post

---

## 10. Frontend Architecture

### Page Structure
```
/                           → Marketing landing page (existing index.html, migrated)
/login                      → Auth page
/onboarding                 → Conversational vault builder (replaces Google Gem)
/dashboard                  → Main command center
/dashboard/projects         → Project list + file upload
/dashboard/pipeline         → Steel Loop status view
/dashboard/sparks           → Approve/reject strategic sparks
/dashboard/drafts           → Review + edit post variations
/dashboard/drafts/[id]      → Single draft editor with carousel preview
/dashboard/publish          → Publishing queue + LinkedIn connection
/dashboard/vault            → Identity Vault viewer/editor
/dashboard/settings         → Account, subscription, LinkedIn OAuth
```

### Mobile-First Design Principles
- The primary use case is a founder reviewing sparks on their phone
- Cards-based UI with swipe-to-approve gestures
- Large tap targets, minimal text input required
- Progressive disclosure: show summary first, details on tap
- Dark mode support matching the existing brand (slate/indigo palette)

---

## 11. Deployment & Infrastructure

### Vercel Configuration
- **Framework**: Next.js (auto-detected)
- **Database**: Vercel Postgres (or Neon) — managed PostgreSQL
- **Blob Storage**: Vercel Blob — for uploaded files and generated PDFs
- **Cron Jobs**: Vercel Cron — for scheduled ingestion checks
- **Environment Variables**:
  ```
  DATABASE_URL=
  ANTHROPIC_API_KEY=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  LINKEDIN_CLIENT_ID=
  LINKEDIN_CLIENT_SECRET=
  BLOB_READ_WRITE_TOKEN=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=
  ```

### Monitoring
- Vercel Analytics for performance
- Sentry for error tracking
- Inngest dashboard for job monitoring

---

## 12. Migration Path from V1.0

### Data Migration Steps
1. Export USER_ACCESS sheet → `users` + `identity_vaults` tables
2. Export CONTENT_PIPELINE sheet → `pipeline_items` table
3. Export POST_VARIATIONS sheet → `sparks` + `post_drafts` tables
4. Export PROJECT_ASSETS sheet → `project_files` table
5. Export STRATEGIC_TARGETS sheet → `strategic_targets` table

### Transition Strategy
- V1.0 continues running during build phase
- V2.0 launches with existing users pre-migrated
- Google Drive folder sharing continues to work (optional legacy ingestion path)
- New users onboard directly through V2.0

---

## 13. Project Directory Structure

```
/
├── docs/
│   └── ARCHITECTURE.md          ← This document
├── prisma/
│   └── schema.prisma            ← Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← Root layout
│   │   ├── page.tsx             ← Marketing landing page
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       ← Dashboard shell (nav, auth gate)
│   │   │   ├── page.tsx         ← Overview
│   │   │   ├── projects/
│   │   │   ├── pipeline/
│   │   │   ├── sparks/
│   │   │   ├── drafts/
│   │   │   ├── publish/
│   │   │   ├── vault/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/
│   │       ├── vault/
│   │       ├── projects/
│   │       ├── pipeline/
│   │       ├── sparks/
│   │       ├── drafts/
│   │       └── webhooks/
│   ├── lib/
│   │   ├── db.ts                ← Prisma client
│   │   ├── auth.ts              ← NextAuth config
│   │   ├── stripe.ts            ← Stripe helpers
│   │   ├── linkedin.ts          ← LinkedIn API client
│   │   ├── ai/
│   │   │   ├── client.ts        ← Claude API wrapper
│   │   │   ├── prompts/
│   │   │   │   ├── scout.ts     ← Scout system prompt
│   │   │   │   ├── architect.ts ← Architect system prompt
│   │   │   │   └── ghostwriter.ts ← Ghostwriter system prompt
│   │   │   └── polyester-test.ts ← Quality validation
│   │   ├── ingestion/
│   │   │   ├── pdf.ts           ← PDF text extraction
│   │   │   ├── docx.ts          ← DOCX text extraction
│   │   │   ├── pptx.ts          ← PPTX text extraction
│   │   │   └── pipeline.ts      ← Orchestrator
│   │   └── vault/
│   │       └── audit.ts         ← Brand Vault v4.1 validation
│   ├── components/
│   │   ├── ui/                  ← shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── spark-card.tsx
│   │   │   ├── draft-editor.tsx
│   │   │   ├── carousel-preview.tsx
│   │   │   └── pipeline-status.tsx
│   │   └── onboarding/
│   │       └── vault-builder.tsx
│   └── jobs/
│       ├── ingest-files.ts      ← Inngest: file conversion job
│       ├── run-scout.ts         ← Inngest: forensic analysis job
│       ├── run-architect.ts     ← Inngest: spark generation job
│       ├── run-ghostwriter.ts   ← Inngest: draft expansion job
│       └── build-carousel.ts   ← Inngest: PDF generation job
├── public/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── .env.local
```
