# VSR Construction Landing Page

This is the marketing and landing website for **VSR Construction**, a company specializing in snow removal, landscaping, hardscaping, and general contracting.

---

## Tech Stack

- [Next.js](https://nextjs.org/) – React framework
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS
- [TypeScript](https://www.typescriptlang.org/) – Optional static typing
- [PostCSS](https://postcss.org/) – For Tailwind integration
- [Vercel](https://vercel.com/) – Deployment (optional)

---

## Project Structure
```
vsr-landing/
├── README.md
├── gitCommands.txt
└── vsr-landing
    ├── README.md
    ├── eslint.config.mjs
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── public
    │   ├── VSR.png
    │   ├── about.jpg
    │   ├── contact_photo.heic
    │   ├── contact_photo.png
    │   ├── dump_truck.jpg
    │   ├── featured_project.png
    │   ├── file.svg
    │   ├── globe.svg
    │   ├── logo.png
    │   ├── next.svg
    │   ├── services.jpg
    │   ├── sidewalk_guy.png
    │   ├── vercel.svg
    │   └── window.svg
    ├── src
    │   ├── components
    │   │   ├── About.tsx
    │   │   ├── Contact.tsx
    │   │   ├── Featured.tsx
    │   │   ├── Footer.tsx
    │   │   ├── Header.tsx
    │   │   ├── Hero.tsx
    │   │   └── Services.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── pages
    │   │   ├── _app.tsx
    │   │   ├── api
    │   │   │   └── ai.ts
    │   │   └── index.tsx
    │   └── styles
    │       └── globals.css
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vsr-test
        ├── README.md
        ├── eslint.config.mjs
        ├── next-env.d.ts
        ├── next.config.ts
        ├── package-lock.json
        ├── package.json
        ├── postcss.config.mjs
        ├── public
        │   ├── file.svg
        │   ├── globe.svg
        │   ├── next.svg
        │   ├── vercel.svg
        │   └── window.svg
        ├── src
        │   └── app
        │       ├── favicon.ico
        │       ├── globals.css
        │       ├── layout.tsx
        │       └── page.tsx
        └── tsconfig.json
```
## Planned Features
- Now Hiring section with backend api to email marcus
- Future AI Assistant
---

## Getting Started
### Local Testing
```bash
git clone https://github.com/kennermatt-cmd/vsr-landing.git
cd vsr-landing
npm install
npm install -D tailwindcss@3.4.1 postcss autoprefixer
npm install formidable nodemailer
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to view.
### Docker Testing
Include Dockerfile and .dockerignore in root.  
Build and run the docker image
```
docker build -t vsr-app .
docker run -p 3000:3000 vsr-app
```
---
## Contact
Owner: [Marcus Vargas](mailto:marcus@vsrsnow.com)
Co-Owner: [Zach Lewis](mailto:zach@vsrsnow.com)
Developer: [Matthew Kenner](mailto:m.kenner@outlook.com)

## License
This project is for internal and client use only © 2025 VSR LLC.