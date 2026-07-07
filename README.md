# NewsBoard — Netvibes-style news aggregator

A single-dashboard RSS/Reddit/YouTube news aggregator built with **Node.js + Express**, **React + Vite + Tailwind CSS**, and **Firebase Firestore** for feed persistence.

---

## Features

- Add any RSS/Atom feed URL
- Shorthand for Reddit (`r/javascript`) and YouTube channel URLs
- Drag-and-drop widget reordering (persisted to Firestore)
- Live article fetch with thumbnail support
- Refresh individual feed widgets

---

## Setup

### 1. Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) → create a project
2. Enable **Firestore Database** (start in production mode)
3. Go to **Project Settings → Service Accounts → Generate new private key** — download the JSON
4. Deploy Firestore rules: `firebase deploy --only firestore:rules` (or paste `firestore.rules` in the console)

### 2. Server

```bash
cd server
cp .env.example .env
# Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY from the downloaded JSON
npm install
npm run dev
```

### 3. Client

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 — the Vite proxy forwards `/api` calls to `http://localhost:3001`.

---

## Project structure

```
news/
├── server/
│   ├── src/
│   │   ├── index.js          # Express entry point
│   │   ├── firebase.js       # Admin SDK init
│   │   ├── feedParser.js     # rss-parser + URL normalizer
│   │   └── routes/feeds.js   # Feed CRUD + article fetch
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # DnD grid
│   │   │   ├── FeedCard.jsx       # Feed widget
│   │   │   ├── ArticleItem.jsx    # Single article row
│   │   │   └── AddFeedModal.jsx   # Add-feed dialog
│   │   ├── hooks/
│   │   │   ├── useFeeds.js        # Feed list state
│   │   │   └── useArticles.js     # Per-feed article fetch
│   │   └── lib/api.js             # Fetch wrapper
│   └── vite.config.js
└── firestore.rules
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/feeds` | List all saved feeds |
| POST | `/api/feeds` | Add a feed `{ url, label? }` |
| DELETE | `/api/feeds/:id` | Remove a feed |
| PATCH | `/api/feeds/reorder` | Bulk reorder `{ order: [{id, order}] }` |
| GET | `/api/feeds/:id/articles` | Fetch live articles for a feed |
