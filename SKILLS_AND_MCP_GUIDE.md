# Skills & MCP Servers Reference Guide

> Generated: 2026-04-24 | Machine: `C:\Users\Bojan Eftimoski`
>
> **Skills documented:** 48 | **MCP servers documented:** 8 | **Plugins:** 11

---

## Table of Contents

- [Skills](#skills)
  - [adapt](#adapt)
  - [algorithmic-art](#algorithmic-art)
  - [animate](#animate)
  - [arrange](#arrange)
  - [audit](#audit)
  - [bolder](#bolder)
  - [brand-guidelines](#brand-guidelines)
  - [canvas-design](#canvas-design)
  - [clarify](#clarify)
  - [claude-api](#claude-api)
  - [claude-mem:do](#claude-memdo)
  - [claude-mem:knowledge-agent](#claude-memknowledge-agent)
  - [claude-mem:make-plan](#claude-memmake-plan)
  - [claude-mem:mem-search](#claude-memmem-search)
  - [claude-mem:smart-explore](#claude-memsmart-explore)
  - [claude-mem:timeline-report](#claude-memtimeline-report)
  - [claude-mem:version-bump](#claude-memversion-bump)
  - [colorize](#colorize)
  - [critique](#critique)
  - [delight](#delight)
  - [distill](#distill)
  - [doc-coauthoring](#doc-coauthoring)
  - [docx](#docx)
  - [extract](#extract)
  - [frontend-design](#frontend-design)
  - [harden](#harden)
  - [internal-comms](#internal-comms)
  - [mcp-builder](#mcp-builder)
  - [normalize](#normalize)
  - [onboard](#onboard)
  - [optimize](#optimize)
  - [overdrive](#overdrive)
  - [pdf](#pdf)
  - [polish](#polish)
  - [pptx](#pptx)
  - [pr-review-toolkit:review-pr](#pr-review-toolkitreview-pr)
  - [quieter](#quieter)
  - [ralph-loop](#ralph-loop)
  - [repomix-commands:pack-local](#repomix-commandspack-local)
  - [repomix-commands:pack-remote](#repomix-commandspack-remote)
  - [skill-creator](#skill-creator)
  - [slack-gif-creator](#slack-gif-creator)
  - [superpowers (collection)](#superpowers-collection)
  - [supabase](#supabase)
  - [teach-impeccable](#teach-impeccable)
  - [theme-factory](#theme-factory)
  - [typeset](#typeset)
  - [ui-ux-pro-max](#ui-ux-pro-max)
  - [webapp-testing](#webapp-testing)
  - [web-artifacts-builder](#web-artifacts-builder)
  - [xlsx](#xlsx)
- [MCP Servers](#mcp-servers)
  - [claude-mem (MCP Search)](#claude-mem-mcp-search)
  - [context7 (Upstash)](#context7-upstash)
  - [Google Calendar](#google-calendar)
  - [Google Drive](#google-drive)
  - [Gmail](#gmail)
  - [magic (21st Design System)](#magic-21st-design-system)
  - [repomix](#repomix)
  - [supabase (MCP)](#supabase-mcp)
- [Combining Skills and MCPs](#combining-skills-and-mcps)
- [Quick Reference](#quick-reference)

---

## Skills

### adapt

**Purpose:** Adapt designs for different screen sizes, devices, and platforms.

**Auto-triggers:** responsive design, mobile layouts, breakpoints, viewport adaptation, cross-device, touch targets

**Capabilities:**
- Implement CSS breakpoints and fluid layouts
- Add proper touch targets (44x44px minimum)
- Convert desktop-first to mobile-first
- Handle viewport-specific behavior

**Limitations:**
- Requires `/frontend-design` context first
- Run `/teach-impeccable` if no design context exists

**Example prompts:**
```
"Make this desktop dashboard responsive for tablets and phones"
"Add proper touch targets and breakpoints to this component"
"Adapt this layout for cross-platform use"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\adapt` → `C:\Users\Bojan Eftimoski\.agents\skills\adapt`

---

### algorithmic-art

**Purpose:** Create generative art using p5.js with seeded randomness and interactive parameter exploration.

**Auto-triggers:** generative art, algorithmic art, flow fields, particle systems, creating art using code

**Capabilities:**
- Create algorithmic philosophies (computational aesthetic movements)
- Generate p5.js interactive generative art with seeded randomness
- Build interactive viewers with parameter controls (sliders, color pickers)
- Implement seed navigation (prev/next/random buttons)
- Create parametric variations through seed exploration
- Support real-time parameter updates and regeneration

**Limitations:**
- Must create original art, not copy existing artists' work
- Limited to p5.js library
- Output is algorithmic/interactive, not static images
- Must follow `templates/viewer.html` pattern

**Example prompts:**
```
"Create a generative art piece with flowing particles that evolve based on noise fields"
"Make algorithmic art inspired by natural systems with parametric controls"
"Generate an interactive art viewer with 100 unique seed variations"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\algorithmic-art\`

---

### animate

**Purpose:** Enhance features with purposeful animations, micro-interactions, and motion effects.

**Auto-triggers:** animation, transitions, micro-interactions, motion design, hover effects, making things feel alive

**Capabilities:**
- Add CSS/JS animations and transitions
- Create scroll-triggered reveals
- Implement state-change feedback
- Add loading and progress animations

**Limitations:**
- Requires `/frontend-design` context first
- Must respect `prefers-reduced-motion`

**Example prompts:**
```
"Add smooth transitions and micro-interactions to this card component"
"Animate the page transitions in this SPA"
"Add scroll-driven reveal animations to this landing page"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\animate` → `C:\Users\Bojan Eftimoski\.agents\skills\animate`

---

### arrange

**Purpose:** Improve layout, spacing, and visual rhythm.

**Auto-triggers:** layout feels off, spacing issues, visual hierarchy, crowded UI, alignment problems

**Capabilities:**
- Fix monotonous grids and inconsistent spacing
- Improve visual hierarchy and flow
- Create proper whitespace rhythm
- Establish alignment systems

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"The spacing in this dashboard feels off — fix the visual rhythm"
"Improve the layout hierarchy of this settings page"
"This grid is monotonous — make the layout more dynamic"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\arrange` → `C:\Users\Bojan Eftimoski\.agents\skills\arrange`

---

### audit

**Purpose:** Run technical quality checks across accessibility, performance, theming, responsive design, and anti-patterns.

**Auto-triggers:** accessibility check, performance audit, design review, quality check, WCAG compliance

**Capabilities:**
- Score accessibility (WCAG compliance)
- Rate performance (loading, rendering)
- Check responsive design quality
- Identify anti-patterns
- Generate P0-P3 severity report with actionable plan

**Limitations:**
- Requires `/frontend-design` context first
- Automated checks only — not a substitute for real user testing

**Example prompts:**
```
"Audit this page for accessibility violations"
"Run a full quality check on this component"
"Check this form for WCAG compliance issues"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\audit` → `C:\Users\Bojan Eftimoski\.agents\skills\audit`

---

### bolder

**Purpose:** Amplify safe/boring designs to increase visual impact while maintaining usability.

**Auto-triggers:** design looks bland, generic, too safe, lacks personality, wants more visual impact

**Capabilities:**
- Increase visual contrast and impact
- Add bolder typography and color choices
- Create more distinctive visual identity
- Push designs beyond generic templates

**Limitations:**
- Requires `/frontend-design` context first
- Won't sacrifice usability for aesthetics

**Example prompts:**
```
"This landing page looks too generic — make it bolder"
"Push this design further, it's too safe and corporate"
"Add more personality and visual punch to this dashboard"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\bolder` → `C:\Users\Bojan Eftimoski\.agents\skills\bolder`

---

### brand-guidelines

**Purpose:** Apply Anthropic's official brand colors and typography to any artifact.

**Auto-triggers:** branding, brand colors, visual style, corporate identity, brand guidelines, Anthropic style

**Capabilities:**
- Apply official Anthropic brand colors (dark #141413, light #faf9f5, accent colors)
- Apply proper typography (Poppins for headings, Lora for body)
- Smart font fallback to Arial/Georgia
- Apply brand colors to shapes and accents
- Cycle through accent colors (orange, blue, green)

**Limitations:**
- Only applies Anthropic brand specifications
- Cannot create custom branding beyond Anthropic guidelines
- Font fallback required if custom fonts unavailable

**Example prompts:**
```
"Apply Anthropic brand styling to this presentation"
"Make this design match our official brand guidelines"
"Use brand colors and typography for this report"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\brand-guidelines\`

---

### canvas-design

**Purpose:** Create beautiful visual art in PNG and PDF documents using design philosophy.

**Auto-triggers:** create a poster, piece of art, design, static piece, visual art

**Capabilities:**
- Create design philosophies/aesthetic movements
- Generate museum or magazine-quality visual designs
- Produce single or multi-page PDF/PNG outputs
- Use repeating patterns and perfect shapes
- Incorporate sparse, clinical typography
- Apply limited, intentional color palettes
- Ships with 30+ bundled fonts (in `canvas-fonts/`)

**Limitations:**
- Must create original designs, not copy existing artists
- Outputs are static (not interactive)
- Typography must be design-forward with proper fonts

**Example prompts:**
```
"Create an abstract poster about quantum mechanics"
"Design a minimalist visual representation of data flow"
"Make a museum-quality piece about ephemeral concepts"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\canvas-design\`

---

### clarify

**Purpose:** Improve unclear UX copy, error messages, microcopy, labels, and instructions.

**Auto-triggers:** confusing text, unclear labels, bad error messages, hard-to-follow instructions, UX writing

**Capabilities:**
- Rewrite error messages for clarity
- Improve form labels and instructions
- Fix unclear call-to-action text
- Simplify technical jargon for end users

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"These error messages are confusing — rewrite them for clarity"
"Improve the labels and microcopy on this form"
"Make the onboarding instructions easier to understand"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\clarify` → `C:\Users\Bojan Eftimoski\.agents\skills\clarify`

---

### claude-api

**Purpose:** Build apps with the Claude API or Anthropic SDK.

**Auto-triggers:** code imports `anthropic`, `@anthropic-ai/sdk`, `claude_agent_sdk`; user asks about Claude API, Anthropic SDKs, Agent SDK

**Does NOT trigger:** code imports `openai` or other AI SDKs, general ML tasks

**Capabilities:**
- Build single API call applications
- Implement tool use and function calling
- Create agents with custom tools
- Use tool runner for automatic loop handling
- Structured outputs and batch processing
- File uploads and file API
- Prompt caching and streaming
- Vision capabilities
- Adaptive thinking (Opus 4.6)
- Code execution in sandbox
- Supports Python, TypeScript, Go, Java, PHP, C#, cURL

**Limitations:**
- Cannot use with non-Anthropic AI APIs
- Agent SDK only available for Python and TypeScript
- Some features require specific model versions

**Example prompts:**
```
"Build a chatbot using the Claude API with streaming"
"Create a tool-using agent that can read files and analyze them"
"Implement batch processing for my document analysis pipeline"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\claude-api\`

---

### claude-mem:do

**Purpose:** Execute a phased implementation plan using subagents.

**Auto-triggers:** execute a plan, run the plan, carry out plan, implement the phases

**Capabilities:**
- Orchestrate multi-phase implementation plans
- Dispatch subagents for parallel work
- Track progress across phases

**Limitations:**
- Best when used after `/claude-mem:make-plan`
- Requires clear phase definitions

**Example prompts:**
```
"Execute the implementation plan we just created"
"Run the plan using subagents for each phase"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\do\`

---

### claude-mem:knowledge-agent

**Purpose:** Build and query AI-powered knowledge bases from claude-mem observations.

**Auto-triggers:** create a knowledge base, compile expertise, ask about past patterns

**Capabilities:**
- Create focused "brains" from observation history
- Query past work patterns
- Compile expertise on specific topics

**Example prompts:**
```
"Build a knowledge base about our authentication patterns"
"What do our past sessions say about database optimization?"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\knowledge-agent\`

---

### claude-mem:make-plan

**Purpose:** Create detailed, phased implementation plans with documentation discovery.

**Auto-triggers:** plan a feature, plan implementation, multi-step task planning

**Capabilities:**
- Create phased implementation plans
- Discover relevant documentation
- Break complex tasks into manageable phases
- Pairs with `/claude-mem:do` for execution

**Example prompts:**
```
"Create an implementation plan for adding user notifications"
"Plan the migration from REST to GraphQL"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\make-plan\`

---

### claude-mem:mem-search

**Purpose:** Search claude-mem's persistent cross-session memory database.

**Auto-triggers:** "did we already solve this?", "how did we do X last time?", needs work from previous sessions

**Capabilities:**
- 3-layer search workflow to avoid token waste
- Search across all past sessions
- Find previous solutions and approaches

**Example prompts:**
```
"Search memory for how we handled the payment integration"
"Did we already solve the caching issue last week?"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\mem-search\`

---

### claude-mem:smart-explore

**Purpose:** Token-optimized structural code search using tree-sitter AST parsing.

**Auto-triggers:** understand code structure, find functions, explore codebase efficiently

**Capabilities:**
- Parse code into AST for structural understanding
- Find functions, classes, and exports without reading full files
- Minimize token usage during exploration

**Example prompts:**
```
"Use smart-explore to find all exported functions in this module"
"Explore the codebase structure without reading every file"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\smart-explore\`

---

### claude-mem:timeline-report

**Purpose:** Generate a "Journey Into [Project]" narrative report analyzing development history from claude-mem's timeline.

**Auto-triggers:** timeline report, project history, development journey, full project report

**Capabilities:**
- Analyze entire development history
- Generate narrative reports across sessions
- Identify patterns and milestones

**Example prompts:**
```
"Generate a timeline report for this project"
"Show me the development journey across all our sessions"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\timeline-report\`

---

### claude-mem:version-bump

**Purpose:** Automated semantic versioning and release workflow for Claude Code plugins.

**Auto-triggers:** version bump, release, publish to npm, increment version

**Capabilities:**
- Semantic version increments across package.json, marketplace.json, plugin.json
- npm publishing (so `npx claude-mem@X.Y.Z` resolves)
- Build verification, git tagging, GitHub releases

**Example prompts:**
```
"Bump version from 1.0.0 to 1.1.0 and publish"
"Create a new release with git tag"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\thedotmack\claude-mem\12.3.9\skills\version-bump\`

---

### colorize

**Purpose:** Add strategic color to monochromatic features.

**Auto-triggers:** design looks gray, dull, lacking warmth, needing more color, wanting a vibrant feel

**Capabilities:**
- Add intentional color to monochromatic layouts
- Create cohesive color systems
- Apply semantic color meaning
- Maintain accessibility contrast ratios

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"This dashboard is too gray — add strategic color"
"Make this interface more vibrant without sacrificing readability"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\colorize` → `C:\Users\Bojan Eftimoski\.agents\skills\colorize`

---

### critique

**Purpose:** Evaluate design from a UX perspective with quantitative scoring and persona-based testing.

**Auto-triggers:** evaluate this design, design review, UX assessment, design feedback

**Capabilities:**
- Visual hierarchy assessment
- Information architecture evaluation
- Emotional resonance scoring
- Cognitive load measurement
- Persona-based testing
- Actionable improvement feedback

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Critique this checkout flow from a UX perspective"
"Score this design on hierarchy, accessibility, and emotional impact"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\critique` → `C:\Users\Bojan Eftimoski\.agents\skills\critique`

---

### delight

**Purpose:** Add moments of joy, personality, and unexpected touches to interfaces.

**Auto-triggers:** add polish, personality, animations, micro-interactions, delight, make it memorable

**Capabilities:**
- Add delightful micro-interactions
- Create personality through motion and copy
- Add unexpected positive moments in user flows
- Elevate functional to memorable

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Add moments of delight to this onboarding flow"
"Make this interface feel more playful and memorable"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\delight` → `C:\Users\Bojan Eftimoski\.agents\skills\delight`

---

### distill

**Purpose:** Strip designs to their essence by removing unnecessary complexity.

**Auto-triggers:** simplify, declutter, reduce noise, remove elements, make UI cleaner

**Capabilities:**
- Remove unnecessary UI elements
- Simplify information architecture
- Reduce cognitive load
- Create focused, clean interfaces

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"This settings page has too much going on — distill it"
"Simplify this dashboard to show only what matters"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\distill` → `C:\Users\Bojan Eftimoski\.agents\skills\distill`

---

### doc-coauthoring

**Purpose:** Structured workflow for co-authoring documentation (PRDs, specs, RFCs, proposals).

**Auto-triggers:** write a doc, draft a proposal, create a spec, write up, technical specification

**Capabilities:**
- Three-stage workflow: Context Gathering → Refinement & Structure → Reader Testing
- Iterative section-by-section drafting
- Brainstorming and curation system
- Reader testing with sub-agents
- Final quality checks

**Limitations:**
- Requires user engagement throughout three stages
- Not suitable for quick, simple documents

**Example prompts:**
```
"Help me write a technical specification for the new auth system"
"Co-author a decision document about our infrastructure migration"
"Guide me through creating a detailed PRD"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\doc-coauthoring\`

---

### docx

**Purpose:** Create, read, edit, or manipulate Word documents (.docx files).

**Auto-triggers:** Word doc, word document, .docx, report, memo, letter, template

**Capabilities:**
- Create new DOCX files from scratch using docx-js
- Read and analyze DOCX content
- Edit existing documents (unpack → modify XML → repack)
- Add tracked changes and comments
- Insert images, tables, headers, footers, page numbers
- Table of contents, hyperlinks, footnotes, endnotes
- Multi-column layouts, page breaks, section management
- Convert .doc to .docx, accept tracked changes

**Limitations:**
- Legacy .doc files need conversion before editing
- Page size defaults to A4 (must specify US Letter explicitly)
- Tables need dual widths for consistent rendering

**Example prompts:**
```
"Create a professional report template with headers and TOC"
"Edit this Word document to add new sections and tracked changes"
"Convert this letter to a properly formatted DOCX file"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\docx\`

---

### extract

**Purpose:** Extract and consolidate reusable components and design tokens into a design system.

**Auto-triggers:** create components, refactor repeated UI, design system, component library

**Capabilities:**
- Identify reusable patterns
- Create component abstractions
- Consolidate design tokens
- Enrich component library

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Extract reusable components from this page"
"Consolidate repeated button styles into a design system"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\extract` → `C:\Users\Bojan Eftimoski\.agents\skills\extract`

---

### frontend-design

**Purpose:** Create distinctive, production-grade frontend interfaces with high design quality.

**Auto-triggers:** build web components, design a landing page, create a dashboard, web UI, style/beautify

**Capabilities:**
- Bold aesthetic direction selection (minimalist, maximalist, retro, luxury, playful, brutalist)
- Custom typography with unique font pairings
- Advanced color and theme strategies (OKLCH, CSS variables)
- Motion and animations (CSS-only or Motion library)
- Spatial composition and unexpected layouts
- Background effects, textures, gradients
- State management and routing (for complex UIs)
- Responsive design
- Production-grade HTML/CSS/React/Vue output

**Limitations:**
- Must avoid generic AI aesthetics (Inter font, purple gradients, glassmorphism, centered layouts)
- Requires intentional design choices

**Example prompts:**
```
"Create a brutalist-style dashboard for data visualization"
"Design a landing page with bold typography and unexpected layout"
"Build a retro-futuristic web component with custom animations"
```

**Path (plugin):** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\claude-plugins-official\frontend-design\`
**Path (symlink):** `C:\Users\Bojan Eftimoski\.claude\skills\frontend-design` → `C:\Users\Bojan Eftimoski\.agents\skills\frontend-design`
**Path (document-skills):** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\frontend-design\`

---

### harden

**Purpose:** Improve interface resilience through better error handling, i18n, text overflow, and edge cases.

**Auto-triggers:** harden, make production-ready, handle edge cases, error states, i18n

**Capabilities:**
- Add error boundaries and fallback states
- Handle text overflow and truncation
- Prepare for internationalization
- Cover edge cases (empty, loading, error, many items)

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Harden this component for production — handle all edge cases"
"Add proper error states and loading indicators"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\harden` → `C:\Users\Bojan Eftimoski\.agents\skills\harden`

---

### internal-comms

**Purpose:** Resources for writing internal communications using company-specific formats.

**Auto-triggers:** status report, leadership update, company newsletter, project update, 3P update, FAQ

**Capabilities:**
- Write 3P updates (Progress, Plans, Problems)
- Create company newsletters
- Write FAQ responses, status reports, incident reports
- Follow company-specific guidelines and formats

**Limitations:**
- Requires knowing company's preferred formats
- Limited to specific communication types
- Not for external communications

**Example prompts:**
```
"Help me write a weekly 3P update for the team"
"Create a company-wide newsletter for this month"
"Write an incident report for yesterday's outage"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\internal-comms\`

---

### mcp-builder

**Purpose:** Guide for creating high-quality MCP servers that connect LLMs to external services.

**Auto-triggers:** build MCP, create MCP server, Model Context Protocol, integrate API for LLM

**Capabilities:**
- Research and plan MCP implementation
- Design tool coverage (API endpoints vs workflow tools)
- Tool schemas with Zod (TypeScript) or Pydantic (Python)
- Structured output support
- Error handling with actionable messages
- Pagination, annotations (readonly, destructive, idempotent)
- Create evaluations to test effectiveness
- Streamable HTTP or stdio transport

**Limitations:**
- Limited to TypeScript and Python
- Requires understanding of MCP specification
- Needs comprehensive testing

**Example prompts:**
```
"Help me build an MCP server for GitHub integration"
"Create a high-quality MCP that wraps the Stripe API"
"Guide me through implementing and testing an MCP server"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\mcp-builder\`

---

### normalize

**Purpose:** Audit and realign UI to match design system standards.

**Auto-triggers:** consistency, design drift, mismatched styles, tokens, bring in line with the system

**Capabilities:**
- Audit for design token compliance
- Fix inconsistent spacing and colors
- Realign with design system patterns
- Standardize component usage

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Normalize this page to match our design system tokens"
"Fix the inconsistent spacing and color usage across components"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\normalize` → `C:\Users\Bojan Eftimoski\.agents\skills\normalize`

---

### onboard

**Purpose:** Design onboarding flows, empty states, and first-run experiences.

**Auto-triggers:** onboarding, first-time users, empty states, activation, getting started, new user flows

**Capabilities:**
- Design progressive onboarding flows
- Create meaningful empty states
- Build first-run experiences
- Optimize activation funnels

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"Design an onboarding flow for new users of this SaaS app"
"Create meaningful empty states for the dashboard"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\onboard` → `C:\Users\Bojan Eftimoski\.agents\skills\onboard`

---

### optimize

**Purpose:** Diagnose and fix UI performance across loading, rendering, animations, images, and bundle size.

**Auto-triggers:** slow, laggy, janky, performance, bundle size, load time, smoother experience

**Capabilities:**
- Optimize loading speed and rendering
- Fix janky animations (target 60fps)
- Optimize images (WebP/AVIF, lazy loading)
- Reduce bundle size
- Fix CLS (< 0.1 target)

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"This page loads slowly — optimize performance"
"Fix the janky scroll animations on this list"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\optimize` → `C:\Users\Bojan Eftimoski\.agents\skills\optimize`

---

### overdrive

**Purpose:** Push interfaces past conventional limits with technically ambitious implementations.

**Auto-triggers:** wow, impress, go all-out, extraordinary, shaders, spring physics, scroll-driven reveals

**Capabilities:**
- Shader-based visual effects
- Spring physics animations
- Scroll-driven reveals at 60fps
- Technically ambitious UI implementations

**Limitations:**
- Requires `/frontend-design` context first
- Performance-intensive — use sparingly

**Example prompts:**
```
"Go all-out on this hero section — make it extraordinary"
"Add shader-based background effects to this landing page"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\overdrive` → `C:\Users\Bojan Eftimoski\.agents\skills\overdrive`

---

### pdf

**Purpose:** Read, extract, combine, split, create, encrypt, and manipulate PDF files.

**Auto-triggers:** .pdf, PDF file, any PDF operation

**Capabilities:**
- Extract text and tables from PDFs
- Merge multiple PDFs / split into pages
- Rotate pages, add watermarks
- Create new PDFs from scratch
- Fill PDF forms
- Encrypt/decrypt PDFs
- Extract images, extract metadata
- OCR on scanned PDFs (pytesseract)
- Convert PDFs to images
- Validate PDFs

**Limitations:**
- OCR requires pytesseract and pdf2image
- Some operations require poppler, qpdf CLI tools
- Cannot edit PDF text directly (conversion needed)

**Example prompts:**
```
"Extract all tables from this PDF and create an Excel file"
"Merge these 5 PDF files into one document"
"OCR this scanned PDF to make it searchable"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\pdf\`

---

### polish

**Purpose:** Final quality pass fixing alignment, spacing, consistency, and micro-detail issues.

**Auto-triggers:** polish, finishing touches, pre-launch review, something looks off, good to great

**Capabilities:**
- Fix pixel-level alignment issues
- Correct spacing inconsistencies
- Ensure visual consistency across states
- Micro-detail refinement

**Limitations:**
- Requires `/frontend-design` context first
- Best used as a final step

**Example prompts:**
```
"Do a final polish pass on this component before we ship"
"Something looks off in this layout — find and fix the issues"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\polish` → `C:\Users\Bojan Eftimoski\.agents\skills\polish`

---

### pptx

**Purpose:** Create, read, edit, or manipulate PowerPoint presentations.

**Auto-triggers:** deck, slides, presentation, .pptx, pitch deck

**Capabilities:**
- Create presentations from scratch using pptxgenjs
- Read and extract text from presentations
- Edit existing presentations
- Combine or split slide files
- Manage speaker notes and comments
- Apply color palettes and typography
- Create data visualization slides
- Add images, charts, icons
- Convert to images for visual inspection

**Limitations:**
- Must avoid plain text-only slides
- Cannot repeat same layout across all slides
- No accent lines under titles (AI hallmark)

**Example prompts:**
```
"Create a pitch deck with 10 professional slides"
"Read this presentation and summarize the key points"
"Edit my presentation to improve the visual design"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\pptx\`

---

### pr-review-toolkit:review-pr

**Purpose:** Comprehensive PR review using specialized agents.

**Auto-triggers:** review this PR, code review, PR review

**Capabilities:**
- PR comment analysis and suggestions
- Test coverage assessment
- Error handling pattern evaluation
- Type design and signature review
- Code quality scoring
- Code simplification suggestions
- Complexity analysis
- Uses 6 specialized agents: code-reviewer, simplifier, comment-analyzer, test-analyzer, silent-failure-hunter, type-design-analyzer

**Limitations:**
- Specialized in 6 areas; may not cover all review aspects

**Example prompts:**
```
"Review PR #42 for test coverage and error handling"
"Analyze the types and signatures in this PR"
"/review-pr 123"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\claude-plugins-official\pr-review-toolkit\`

---

### quieter

**Purpose:** Tone down visually aggressive or overstimulating designs.

**Auto-triggers:** too bold, too loud, overwhelming, aggressive, garish, calmer, more refined

**Capabilities:**
- Reduce visual intensity while preserving quality
- Soften color palettes
- Calm typography and layout
- Create more refined aesthetic

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"This design is too loud — tone it down"
"Make this dashboard calmer and more professional"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\quieter` → `C:\Users\Bojan Eftimoski\.agents\skills\quieter`

---

### ralph-loop

**Purpose:** Continuous self-referential AI loops for iterative development until task completion.

**Auto-triggers:** `/ralph-loop`, `/cancel-ralph`

**Capabilities:**
- `/ralph-loop` — Start Ralph Loop in current session
- `/cancel-ralph` — Cancel active Ralph Loop
- `/help` — Explain Ralph Loop plugin
- Runs Claude in a while-true loop until task completion

**Limitations:**
- Can enter infinite loops if completion criteria are unclear
- Requires explicit cancellation to stop

**Example prompts:**
```
"/ralph-loop iteratively improve this component until it matches the spec"
"/cancel-ralph"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\claude-plugins-official\ralph-loop\1.0.0\`

---

### repomix-commands:pack-local

**Purpose:** Pack local codebase with Repomix for AI analysis.

**Auto-triggers:** `/pack-local`

**Capabilities:**
- Generate complete codebase summary
- Security scanning included
- Searchable output

**Example prompts:**
```
"/pack-local"
"Pack this codebase for analysis"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\repomix\repomix-commands\1.0.2\`

---

### repomix-commands:pack-remote

**Purpose:** Pack and analyze a remote GitHub repository.

**Auto-triggers:** `/pack-remote`

**Capabilities:**
- Analyze remote repositories
- Generate structure and dependency summary
- Security scanning

**Example prompts:**
```
"/pack-remote https://github.com/vercel/next.js"
"Analyze this remote GitHub repo"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\repomix\repomix-commands\1.0.2\`

---

### skill-creator

**Purpose:** Create new skills, modify existing skills, and measure skill performance.

**Auto-triggers:** create a skill, edit a skill, optimize a skill, skill performance

**Capabilities:**
- Capture skill intent and requirements
- Write SKILL.md files
- Create test cases and evaluations (evals.json)
- Run skill tests with subagents
- Grade and benchmark results
- Optimize descriptions for triggering
- Perform blind comparisons between versions
- Package skills for distribution

**Limitations:**
- Requires iterative refinement cycle
- Evals require `claude -p` (Claude Code only)

**Example prompts:**
```
"Help me create a new skill for document processing"
"Optimize my skill's description for better triggering"
"Run evals to benchmark my skill performance"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\skill-creator\`

---

### slack-gif-creator

**Purpose:** Create animated GIFs optimized for Slack.

**Auto-triggers:** make a GIF, create a GIF for Slack, animated GIF

**Capabilities:**
- Create animated GIFs with PIL/Pillow
- Optimize for Slack emoji (128x128) or messages (480x480)
- Animation concepts: shake, pulse, bounce, spin, fade, slide, zoom, explode
- Easing functions for smooth motion
- Work with user-uploaded images or draw from scratch
- GIF optimization (fewer frames, fewer colors)

**Limitations:**
- Cannot use emoji fonts reliably
- Limited to PIL drawing primitives
- Emoji GIFs must be under 3 seconds
- Cannot create photorealistic animations

**Example prompts:**
```
"Make me an animated GIF of a bouncing star for Slack"
"Create a pulsing heart emoji GIF"
"Design a spinning loading indicator for Slack"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\slack-gif-creator\`

---

### superpowers (collection)

**Purpose:** Core skills library for Claude Code: TDD, debugging, collaboration patterns, and proven development techniques.

**Version:** 5.0.7

**Sub-skills and triggers:**

| Skill | Auto-triggers |
|-------|---------------|
| `brainstorming` | Before any creative work, features, components |
| `writing-plans` | Spec/requirements for multi-step task, before code |
| `executing-plans` | Have a written plan to execute |
| `test-driven-development` | Implementing any feature or bugfix |
| `systematic-debugging` | Any bug, test failure, unexpected behavior |
| `verification-before-completion` | About to claim work is complete |
| `dispatching-parallel-agents` | 2+ independent tasks |
| `subagent-driven-development` | Executing plans with independent tasks |
| `using-git-worktrees` | Feature work needing isolation |
| `receiving-code-review` | Received code review feedback |
| `requesting-code-review` | Completing tasks, before merging |
| `finishing-a-development-branch` | Implementation complete, all tests pass |
| `writing-skills` | Creating/editing/verifying skills |
| `using-superpowers` | Starting any conversation |

**Limitations:**
- Skills override defaults only; user instructions take precedence
- Rigid skills (TDD, debugging) require full adherence

**Example prompts:**
```
"Start with brainstorming to explore requirements for the new auth feature"
"This test is failing — use systematic-debugging to find root cause"
"Use TDD to implement this new endpoint"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\claude-plugins-official\superpowers\5.0.7\`

---

### supabase

**Purpose:** Official Supabase plugin for database, auth, storage, Postgres best practices, and real-time capabilities.

**Version:** 0.1.5

**Auto-triggers:** Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues), client libraries (supabase-js, @supabase/ssr), auth issues, schema changes, migrations, RLS, Postgres extensions

**Sub-skills:**
- `supabase` — Core project management, database operations
- `supabase-postgres-best-practices` — Performance optimization, RLS security patterns

**Capabilities:**
- Database schema management and migrations
- Authentication and session handling
- Row-level security (RLS) policy design
- Storage access control
- Real-time subscriptions
- Edge functions deployment
- Vector database operations

**Limitations:**
- Supabase changes frequently — must verify against current docs
- Requires RLS by default on all exposed schemas
- User metadata is unsafe for authorization (use app_metadata)
- Service role keys must never be in public clients

**Example prompts:**
```
"Set up RLS policies for a multi-tenant SaaS app"
"Debug JWT token expiration in Next.js auth flow"
"Create a secure storage bucket with row-level access control"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\claude-plugins-official\supabase\0.1.5\`

---

### teach-impeccable

**Purpose:** One-time setup to gather design context for your project and save it to AI config.

**Auto-triggers:** Run once per project to establish design guidelines

**Capabilities:**
- Gather brand, audience, and tone context
- Save persistent design guidelines
- Foundation for all other design skills

**Limitations:**
- One-time setup; must re-run if brand changes

**Example prompts:**
```
"Run /teach-impeccable to set up design context for this project"
"Establish our brand guidelines and design preferences"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\teach-impeccable` → `C:\Users\Bojan Eftimoski\.agents\skills\teach-impeccable`

---

### theme-factory

**Purpose:** Toolkit for styling artifacts with pre-set or custom themes.

**Auto-triggers:** apply a theme, style these slides, use a professional theme

**Capabilities:**
- Apply 10 pre-set themes: Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Midnight Tech, Warm Earth, Nordic Frost, Desert Rose, Electric Neon, Classic Elegant
- Create custom themes on-the-fly
- Define color palettes and font pairings
- Apply themes to slides, docs, reports, HTML pages

**Limitations:**
- Best for styling, not content creation
- Theme showcase requires viewing pre-built PDF

**Example prompts:**
```
"Apply the Ocean Depths theme to my presentation"
"Create a custom theme matching my brand colors"
"Show me available themes and apply one to my deck"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\theme-factory\`

---

### typeset

**Purpose:** Improve typography — font choices, hierarchy, sizing, weight, and readability.

**Auto-triggers:** fonts, type, readability, text hierarchy, sizing looks off, polished typography

**Capabilities:**
- Fix font choices and pairings
- Establish proper typographic hierarchy
- Optimize sizing and line-height
- Improve readability and weight contrast

**Limitations:**
- Requires `/frontend-design` context first

**Example prompts:**
```
"The typography feels off — fix the hierarchy and readability"
"Improve the font pairing and sizing on this page"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\skills\typeset` → `C:\Users\Bojan Eftimoski\.agents\skills\typeset`

---

### ui-ux-pro-max

**Purpose:** UI/UX design intelligence with 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks.

**Version:** 2.5.0

**Auto-triggers:** designing pages, creating/refactoring UI components, choosing colors/typography, reviewing UI for UX quality, implementing navigation/animations/responsive behavior, product-level design decisions

**Sub-skills:**
- `ui-ux-pro-max` — Main design intelligence with searchable database
- `design` — Unified design (brand, tokens, UI, logo, presentations, banners, icons)
- `banner-design` — Social media and ad banner design (22 styles)
- `brand` — Brand identity and voice
- `design-system` — Design tokens and specifications
- `ui-styling` — shadcn/ui + Tailwind styling
- `slides` — Presentation and pitch deck design

**10 stacks supported:** React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, HTML/CSS

**Rule priorities:**
1. Accessibility (CRITICAL) — 4.5:1 contrast, alt text, keyboard nav, ARIA
2. Touch & Interaction (CRITICAL) — 44x44px targets, 8px+ spacing
3. Performance (HIGH) — WebP/AVIF, lazy loading, CLS < 0.1
4. Style Selection (HIGH) — Match product type, consistency
5. Layout & Responsive (HIGH) — Mobile-first, no horizontal scroll
6. Typography & Color (MEDIUM) — 16px base, 1.5 line-height
7. Animation (MEDIUM) — 150-300ms, reduced-motion respect
8. Forms & Feedback (MEDIUM) — Visible labels, error near field
9. Navigation (HIGH) — Bottom nav ≤5 items, deep linking
10. Charts & Data (LOW) — Legends, tooltips, accessible colors

**Limitations:**
- Not for pure backend logic or infrastructure

**Example prompts:**
```
"Design a SaaS dashboard with proper accessibility and modern styling"
"Review this UI component for accessibility violations"
"Create a color palette and typography system for a tech startup"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\ui-ux-pro-max-skill\ui-ux-pro-max\2.5.0\`

---

### webapp-testing

**Purpose:** Test local web applications using Playwright.

**Auto-triggers:** test this web app, verify the UI, debug the interface, check the frontend

**Capabilities:**
- Write native Python Playwright scripts
- Launch local web servers automatically
- Verify frontend functionality
- Debug UI behavior
- Capture browser screenshots
- View browser console logs
- Inspect rendered DOM
- Discover selectors from rendered state

**Limitations:**
- Only works with local applications
- Must wait for `networkidle` on dynamic apps
- Limited to Python Playwright scripts

**Example prompts:**
```
"Test if this button click works on my local app"
"Screenshot the dashboard and check for visual issues"
"Verify the form validation is working correctly"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\webapp-testing\`

---

### web-artifacts-builder

**Purpose:** Create elaborate multi-component Claude.ai HTML artifacts using React, Tailwind, and shadcn/ui.

**Auto-triggers:** build a complex artifact, create a React app, multi-component UI, complex web app

**Capabilities:**
- Initialize React 18 + Vite + TypeScript projects
- Pre-install 40+ shadcn/ui components
- Tailwind CSS 3.4.1 included
- Routing and state management
- Bundle to single self-contained HTML file
- Path aliases (@/ notation)
- Test artifacts with Playwright

**Limitations:**
- Not for simple single-file artifacts
- Must avoid "AI slop" aesthetics

**Example prompts:**
```
"Build a multi-page product dashboard with routing"
"Create an interactive data visualization using shadcn/ui"
"Develop a complex form wizard with state management"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\web-artifacts-builder\`

---

### xlsx

**Purpose:** Create, read, edit, or analyze spreadsheet files (.xlsx, .xlsm, .csv, .tsv).

**Auto-triggers:** .xlsx, .xlsm, .csv, .tsv, spreadsheet, Excel file, add columns, compute formulas

**Capabilities:**
- Create new spreadsheets from scratch
- Read and analyze existing spreadsheets
- Edit cells, rows, columns with formulas
- Apply professional formatting and styling
- Create charts and visualizations
- Clean and restructure messy data
- Convert between tabular formats
- Financial model color coding
- Multi-sheet workbooks
- Recalculate formulas using LibreOffice

**Limitations:**
- Must use formulas, not hardcoded calculated values
- Requires LibreOffice for formula recalculation
- Zero formula errors required in deliverables

**Example prompts:**
```
"Create a financial model with revenue projections"
"Clean up this messy CSV and convert to proper spreadsheet"
"Add a profit margin column with formulas"
```

**Path:** `C:\Users\Bojan Eftimoski\.claude\plugins\cache\anthropic-agent-skills\document-skills\98669c11ca63\skills\xlsx\`

---

## MCP Servers

### claude-mem (MCP Search)

**Connects to:** Persistent cross-session memory database

**Scope:** User (global)

**Status:** Failed to connect

**Command:**
```
bun C:/Users/Bojan Eftimoski/.claude/plugins/cache/thedotmack/claude-mem/12.3.9/scripts/mcp-server.cjs
```

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `mcp-search` | Search persistent memory database for past observations and solutions |

**Auth requirements:** None

**Credentials:** N/A

**Known issue:** Server fails to connect. Likely requires `bun` runtime to be installed and accessible in PATH.

**Example prompts:**
```
"Search memory for how we solved the caching problem"
"Find observations from our last auth debugging session"
```

---

### context7 (Upstash)

**Connects to:** Upstash Context7 — up-to-date library documentation from source repositories

**Scope:** User (global)

**Status:** Connected

**Command:**
```
npx -y @upstash/context7-mcp
```

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `resolve-library-id` | Resolve a library name to its Context7 ID |
| `get-library-docs` | Fetch version-specific documentation and code examples |

**Auth requirements:** None

**Credentials:** N/A

**Example prompts:**
```
"Look up the current Next.js 14 authentication patterns"
"Get the latest React hook API documentation"
"Pull the Supabase v2 auth setup guide from source"
```

---

### Google Calendar

**Connects to:** Google Calendar API

**Scope:** User (global, Claude.ai managed)

**Status:** Needs authentication

**URL:** `https://calendarmcp.googleapis.com/mcp/v1`

**Tools exposed:**
| Tool | Description |
|------|-------------|
| Calendar CRUD | Create, read, update, delete calendar events |
| Event search | Search for events by date, keyword |

**Auth requirements:** Google OAuth2 — authenticate via Claude.ai

**Credentials:** `C:\Users\Bojan Eftimoski\.claude\.credentials.json`

**Example prompts:**
```
"What meetings do I have today?"
"Create a meeting for Friday at 2pm"
"Find all events this week with 'standup' in the title"
```

---

### Google Drive

**Connects to:** Google Drive API

**Scope:** User (global, Claude.ai managed)

**Status:** Needs authentication

**URL:** `https://drivemcp.googleapis.com/mcp/v1`

**Tools exposed:**
| Tool | Description |
|------|-------------|
| File search | Search for files and folders |
| File read | Read document contents |
| File management | Create, update, organize files |

**Auth requirements:** Google OAuth2 — authenticate via Claude.ai

**Credentials:** `C:\Users\Bojan Eftimoski\.claude\.credentials.json`

**Example prompts:**
```
"Find the Q4 planning doc in my Drive"
"Read the contents of the shared design spec"
"Search Drive for files updated this week"
```

---

### Gmail

**Connects to:** Gmail API

**Scope:** User (global, Claude.ai managed)

**Status:** Needs authentication

**URL:** `https://gmailmcp.googleapis.com/mcp/v1`

**Tools exposed:**
| Tool | Description |
|------|-------------|
| Email search | Search emails by query |
| Email read | Read email contents |
| Email send | Compose and send emails |

**Auth requirements:** Google OAuth2 — authenticate via Claude.ai

**Credentials:** `C:\Users\Bojan Eftimoski\.claude\.credentials.json`

**Example prompts:**
```
"Find the latest email from the design team"
"Search for emails about the API migration"
"Draft a reply to the last message from Sarah"
```

---

### magic (21st Design System)

**Connects to:** 21st.dev design system and component library

**Scope:** Integrated tool (global)

**Status:** Connected

**Command:**
```
npx -y @21st-dev/magic@latest
```

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `21st_magic_component_builder` | Generate production-grade UI components |
| `21st_magic_component_inspiration` | Get design inspiration and component ideas |
| `21st_magic_component_refiner` | Refine and improve existing components |
| `logo_search` | Search for brand logos |

**Auth requirements:** None

**Credentials:** N/A

**Example prompts:**
```
"Build a hero section component with magic"
"Get inspiration for a pricing table design"
"Refine this card component to look more polished"
```

---

### repomix

**Connects to:** Repomix codebase analysis engine

**Scope:** User (global)

**Status:** Connected

**Command:**
```
npx -y repomix@latest --mcp
```

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `pack_codebase` | Pack local repository into analyzed format with security scanning |
| `pack_remote_repo` | Pack and analyze remote GitHub repositories |
| `read_repomix_output` | Read packed output files |
| `search_repomix_output` | Search within packed codebase |
| `file_system_read` | Read individual files from the codebase |

**Auth requirements:** Optional — `GITHUB_PERSONAL_ACCESS_TOKEN` env var for private repos

**Credentials:** Environment variable (if set)

**Example prompts:**
```
"Pack this codebase and give me an overview of the architecture"
"Analyze the vercel/next.js repo structure"
"Search the packed output for all API endpoints"
```

**Common workflows:**
1. `/pack-local` → search output → understand codebase
2. `/pack-remote <url>` → compare with local patterns

---

### supabase (MCP)

**Connects to:** Supabase platform API

**Scope:** User (global)

**Status:** Needs authentication

**URL:** `https://mcp.supabase.com/mcp`

**Tools exposed:**
| Tool | Description |
|------|-------------|
| Database management | Schema operations, migrations, queries |
| Auth management | User authentication, session handling |
| Storage | File upload/download, bucket management |
| Edge Functions | Deploy and manage serverless functions |

**Auth requirements:** OAuth2 required

**Credentials:** `C:\Users\Bojan Eftimoski\.claude\.credentials.json` (under `mcpOAuth`)

**OAuth Client ID:** `35e72ad3-b7e0-44dc-9957-bc8a9d65da02`

**Example prompts:**
```
"List all tables in my Supabase project"
"Create a new migration for the users table"
"Check the RLS policies on the orders table"
```

---

## Combining Skills and MCPs

### Workflow 1: Full-Stack Feature Development

```
1. /superpowers:brainstorming    → Explore requirements and design
2. /superpowers:writing-plans    → Create phased implementation plan
3. context7 MCP                  → Pull latest framework docs
4. /superpowers:test-driven-development → Red-green-refactor cycle
5. /superpowers:verification-before-completion → Verify before merge
```

### Workflow 2: Design-to-Code Pipeline

```
1. /teach-impeccable             → Establish project design context (once)
2. /ui-ux-pro-max                → Get design system recommendations
3. /frontend-design              → Build the component with bold aesthetics
4. magic MCP (component_builder) → Generate production components
5. /adapt                        → Make responsive across devices
6. /polish                       → Final quality pass
7. /audit                        → Accessibility and performance check
```

### Workflow 3: Documentation & Reporting

```
1. repomix MCP (/pack-local)     → Analyze full codebase
2. /doc-coauthoring              → Co-author technical spec
3. /docx or /pdf                 → Export as Word/PDF document
4. /pptx + /theme-factory        → Create themed presentation
```

### Workflow 4: Cross-Session Continuity

```
1. /claude-mem:mem-search        → Find previous solutions
2. /claude-mem:make-plan         → Plan with documentation discovery
3. /claude-mem:do                → Execute plan with subagents
4. /claude-mem:timeline-report   → Generate project history narrative
```

### Workflow 5: PR Review & Quality

```
1. /pr-review-toolkit:review-pr  → Full PR review with 6 specialized agents
2. /superpowers:receiving-code-review → Process feedback systematically
3. /superpowers:systematic-debugging → Fix issues found
4. /superpowers:verification-before-completion → Confirm all fixes
5. /superpowers:finishing-a-development-branch → Complete the branch
```

---

## Quick Reference

| Name | Use Case | Example Trigger |
|------|----------|-----------------|
| `adapt` | Responsive design | "Make this work on mobile" |
| `algorithmic-art` | Generative art | "Create generative art with p5.js" |
| `animate` | Add motion | "Add animations to this component" |
| `arrange` | Fix layout | "The spacing feels off" |
| `audit` | Quality check | "Audit this for accessibility" |
| `bolder` | Amplify design | "This looks too generic" |
| `brand-guidelines` | Anthropic branding | "Apply brand colors" |
| `canvas-design` | Static visual art | "Create a poster" |
| `clarify` | Improve UX copy | "These error messages are confusing" |
| `claude-api` | Build with Claude | `import anthropic` |
| `claude-mem:do` | Execute plans | "Run the implementation plan" |
| `claude-mem:make-plan` | Create plans | "Plan this feature" |
| `claude-mem:mem-search` | Search memory | "How did we solve this before?" |
| `claude-mem:smart-explore` | AST code search | "Find all exported functions" |
| `claude-mem:timeline-report` | Project history | "Generate a timeline report" |
| `claude-mem:version-bump` | Release management | "Bump version and publish" |
| `colorize` | Add color | "This is too gray" |
| `critique` | Design evaluation | "Evaluate this design" |
| `delight` | Add personality | "Make this more playful" |
| `distill` | Simplify | "Declutter this page" |
| `doc-coauthoring` | Write docs | "Help me write a spec" |
| `docx` | Word documents | "Create a Word report" |
| `extract` | Component reuse | "Extract reusable components" |
| `frontend-design` | Build web UI | "Design a landing page" |
| `harden` | Production-ready | "Handle all edge cases" |
| `internal-comms` | Team updates | "Write a 3P update" |
| `mcp-builder` | Create MCP servers | "Build an MCP for Stripe" |
| `normalize` | Design consistency | "Fix design drift" |
| `onboard` | Onboarding flows | "Design empty states" |
| `optimize` | Performance | "This page is slow" |
| `overdrive` | Advanced effects | "Go all-out on this hero" |
| `pdf` | PDF operations | "Merge these PDFs" |
| `polish` | Final pass | "Do finishing touches" |
| `pptx` | Presentations | "Create a pitch deck" |
| `pr-review-toolkit` | PR review | "/review-pr 123" |
| `quieter` | Reduce intensity | "Too bold, tone it down" |
| `ralph-loop` | Iterative loop | "/ralph-loop improve this" |
| `repomix:pack-local` | Pack codebase | "/pack-local" |
| `repomix:pack-remote` | Pack remote repo | "/pack-remote <url>" |
| `skill-creator` | Create skills | "Help me create a skill" |
| `slack-gif-creator` | Slack GIFs | "Make a GIF for Slack" |
| `superpowers` | Dev workflows | "Use TDD for this feature" |
| `supabase` | Supabase ops | "Set up RLS policies" |
| `teach-impeccable` | Design setup | "Set up design context" |
| `theme-factory` | Apply themes | "Apply Ocean Depths theme" |
| `typeset` | Fix typography | "The fonts feel wrong" |
| `ui-ux-pro-max` | Design system | "Design a SaaS dashboard" |
| `webapp-testing` | Test web apps | "Test this button click" |
| `web-artifacts-builder` | Complex artifacts | "Build a React dashboard" |
| `xlsx` | Spreadsheets | "Create a financial model" |
| **MCP: context7** | Live docs | "Get latest Next.js docs" |
| **MCP: Google Calendar** | Calendar | "What meetings today?" |
| **MCP: Google Drive** | Files | "Find the planning doc" |
| **MCP: Gmail** | Email | "Find email from design team" |
| **MCP: magic** | UI components | "Build a hero section" |
| **MCP: repomix** | Codebase analysis | "Pack and analyze this repo" |
| **MCP: supabase** | Database | "List tables in project" |
| **MCP: claude-mem** | Memory search | "Search past observations" |

---

## Issues Found

| Component | Issue | Severity |
|-----------|-------|----------|
| **claude-mem MCP** | Failed to connect — likely `bun` not in PATH or not installed | High |
| **Google Drive MCP** | Needs OAuth authentication | Medium |
| **Google Calendar MCP** | Needs OAuth authentication | Medium |
| **Gmail MCP** | Needs OAuth authentication | Medium |
| **Supabase MCP** | Needs OAuth authentication | Medium |
| **frontend-design** | Installed in 3 locations (plugin, symlink, document-skills) — potential conflicts | Low |

---

## Installation Locations

**Plugin cache (all plugins):**
```
C:\Users\Bojan Eftimoski\.claude\plugins\cache\
├── anthropic-agent-skills\document-skills\    (17 skills)
├── claude-plugins-official\
│   ├── context7\
│   ├── frontend-design\
│   ├── pr-review-toolkit\
│   ├── ralph-loop\
│   ├── supabase\
│   └── superpowers\                           (14 sub-skills)
├── repomix\
│   ├── repomix-commands\
│   └── repomix-mcp\
├── thedotmack\claude-mem\                     (7 sub-skills)
└── ui-ux-pro-max-skill\ui-ux-pro-max\         (7 sub-skills)
```

**Design skills (symlinks):**
```
C:\Users\Bojan Eftimoski\.claude\skills\       (21 symlinks)
  → C:\Users\Bojan Eftimoski\.agents\skills\   (actual location)
```

**Plugin registry:** `C:\Users\Bojan Eftimoski\.claude\plugins\installed_plugins.json`

**Marketplace configs:** `C:\Users\Bojan Eftimoski\.claude\plugins\marketplaces\`

**Credentials:** `C:\Users\Bojan Eftimoski\.claude\.credentials.json`
