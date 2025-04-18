
# VSR Construction Landing Page

Welcome to the landing page for **VSR Construction**, a company specializing in snow removal and expanding into general contracting services including landscaping, demolition, asphalt and concrete repair, and more.
---
## Changes Made

This section tracks key environment, configuration, and design changes made during setup:

-  **Installed Tailwind CSS v4** and manually configured `tailwind.config.js` and `postcss.config.js`
-  **Fixed PostCSS plugin breaking error** (`@tailwindcss/postcss` now required in v4)
-  **Verified Tailwind styling by adding and rendering `bg-red-500`**
-  **Replaced background `<Image />` with CSS `background-image` for hero**
-  **Centered motto with overlay in `Hero.tsx`**
-  **Header navigation restructured with horizontal layout, spacing, and placeholder dropdown logic**
-  **Added global font scaling (`font-size: 20px`) to `globals.css`**
-  **Prepared for AI integration via `src/pages/api/ai.ts` (REST endpoint)**

---

## Built With

- [Next.js](https://nextjs.org/) – React framework
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS
- [TypeScript](https://www.typescriptlang.org/) – Static typing
- [Vercel](https://vercel.com/) – Optional deployment platform

## Project Structure

```
vsr-landing/
├── public/              # Static assets (logo, background images)
├── src/
│   ├── components/      # Reusable UI components (Hero, Header, etc.)
│   ├── pages/           # Routing pages (index.tsx, API routes)
│   └── styles/          # Tailwind base styles
├── tsconfig.json        # TypeScript config
├── tailwind.config.js   # Tailwind customization
└── README.md            # This file
```

## Planned Features

- Responsive hero section with background image
- Dropdown navigation menu
- Motto display with scrollable sections
- Future AI Assistant

##  AI Integration (Coming Soon)

We'll add an AI-powered chatbot or smart quote assistant.  

```ts
// src/pages/api/ai.ts
```

You can send a POST request here later using:
```ts
fetch('/api/ai', { method: 'POST', body: JSON.stringify({ prompt: "example" }) })
```

## Installation & Dev
### Local Testing
```bash
git clone https://github.com/kennermatt-cmd/vsr-landing.git
cd vsr-landing
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view.

## Notes

- The codebase is ready for AI plugins or integrations.
- Use `.env.local` to store API keys securely for OpenAI or other services.

## Contact

For business inquiries, email: [Marcus](mailto:marcus@vsrsnow.com)  
For developer inquiries, email: [Matthew](mailto:m.kenner@outlook.com)


