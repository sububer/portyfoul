# Portyfoul

A stock and crypto portfolio manager with a thin-client architecture.

## Features

- Create, update, and delete portfolios
- Track stocks and cryptocurrencies with quantities
- Automatic price updates every 15 minutes
- Server-side logic with minimal client UI

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- React 18
- Server-side rendering and API routes

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## Project Structure

```
portyfoul/
├── src/
│   └── app/           # Next.js App Router
│       ├── layout.tsx # Root layout
│       ├── page.tsx   # Home page
│       └── globals.css
├── .github/
│   └── workflows/     # GitHub Actions
└── package.json
```

## License

See LICENSE file for details.
