# Kvitt Poker Ledger - Product Requirements Document

## Original Problem Statement
Build a poker ledger application with web and mobile apps for tracking poker nights, buy-ins, cash-outs, and settlements. The app should allow users to create groups, host games, manage players, and automatically calculate who owes whom at the end.

## User Personas
1. **Host**: Creates and manages poker games, controls buy-ins/cash-outs, settles games
2. **Player**: Joins games, requests buy-ins, cashes out, views their stats
3. **Group Admin**: Manages group membership, invites players

## Core Requirements
- User authentication (Supabase)
- Group creation and management
- Game night creation and hosting
- Real-time buy-in/cash-out tracking
- Automatic settlement calculation
- Game history and stats
- Mobile app (Expo/React Native)

---

## What's Been Implemented

### December 2024 - Web App Core ✅
- Full authentication with Supabase
- Group CRUD operations
- Game night management
- Real-time WebSocket updates
- Player buy-ins and cash-outs
- Settlement calculation
- Game history and stats
- Premium features with Stripe
- AI Assistant

### February 2025 - Mobile App Fixes ✅
- Fixed mobile auth 401 errors (sync-user integration)
- Refactored navigation to drawer style
- Created AuthContext for mobile
- Fixed API endpoint URLs in DashboardScreen

### February 2025 - Spotify Integration ✅
- Backend OAuth2 flow for Spotify
- Token storage per user in MongoDB
- Playback control endpoints (play, pause, skip, volume, seek)
- Search functionality
- SpotifyPlayer component with glass UI
- Web Playback SDK integration
- Host-only control (players see what's playing)
- Added to GameNight sidebar

---

## Pending Issues

### P0 - Critical
- **Mobile Expo Errors**: User getting "expected dynamic type 'boolean'" error when testing mobile app
- **Spotify Credentials**: Waiting for user to create Spotify Developer app and provide Client ID/Secret

### P1 - High Priority  
- Fix game history view on mobile
- Implement "create game" flow on mobile
- Fix/implement "join group" flow on mobile

### P2 - Medium Priority
- User profile editing on mobile
- Apple Music integration (future)

---

## Technical Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main API
- MongoDB collections: users, groups, game_nights, players, transactions, ledger, spotify_tokens
- Supabase JWT authentication
- WebSocket for real-time updates

### Web Frontend (React)
- `/app/frontend/src/` - React app with Tailwind/shadcn
- Key pages: Dashboard, Groups, GroupHub, GameNight, Settlement
- Components: SpotifyPlayer, AIAssistant, Navbar

### Mobile App (Expo/React Native)
- `/app/mobile/src/` - Expo app
- Drawer navigation
- AuthContext for Supabase integration

### Environment Variables
```
# Backend
MONGO_URL, DB_NAME, SUPABASE_URL, SUPABASE_JWT_SECRET
SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI

# Frontend  
REACT_APP_BACKEND_URL

# Mobile
EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
```

---

## Key API Endpoints

### Auth
- `POST /api/auth/sync-user` - Sync Supabase user to MongoDB

### Groups
- `GET/POST /api/groups` - List/Create groups
- `GET /api/groups/:id` - Group details
- `POST /api/groups/:id/join` - Join group

### Games
- `GET/POST /api/games` - List/Create games
- `PUT /api/games/:id/start` - Start game
- `PUT /api/games/:id/end` - End game
- `POST /api/games/:id/buy-in` - Process buy-in
- `POST /api/games/:id/cash-out` - Process cash-out

### Spotify
- `GET /api/spotify/auth-url` - Get OAuth URL
- `POST /api/spotify/token` - Exchange code for token
- `PUT /api/spotify/play|pause|next|previous` - Playback control
- `GET /api/spotify/playback` - Current state

---

## Files of Reference
- `/app/backend/server.py` - All API endpoints
- `/app/frontend/src/pages/GameNight.jsx` - Main game page
- `/app/frontend/src/components/SpotifyPlayer.jsx` - Music player
- `/app/mobile/src/context/AuthContext.tsx` - Mobile auth
- `/app/mobile/src/screens/DashboardScreen.tsx` - Mobile dashboard
