# Stadium Lights 

A mobile app that synchronizes phone flashlights across a stadium audience, creating coordinated light shows controlled by a single operator.

## Overview

Stadium Lights enables event organizers to create stunning visual displays by turning every smartphone in the audience into a synchronized light source. A controller creates a group, shares a code, and triggers patterns that ripple through the crowd based on each participant's GPS-determined position.

## Features

- **Real-time Synchronization** - Flashlights sync across thousands of devices with precise timing
- **GPS-based Zones** - Participants are assigned to zones based on their location in the venue
- **Multiple Patterns** - Sparkle, Wave, Pulse, Strobe, Chase, Spiral, Checkerboard, and Alternating
- **Grid & Ring Modes** - Patterns can animate in rectangular grid or circular ring formations
- **Speed Control** - Adjust pattern speed in real-time (Fast, Normal, Slow)
- **QR Code Sharing** - Controllers can share join codes via QR for easy onboarding
- **Group Management** - Controllers can manage multiple groups, resume sessions, and release codes
- **Deep Linking** - Participants can join via shareable links

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Server                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Express   │◄──►│  Socket.io  │    │ PostgreSQL  │      │
│  │   (HTTP)    │    │ (WebSocket) │    │  (Storage)  │      │
│  └─────────────┘    └──────┬──────┘    └─────────────┘      │
└────────────────────────────┼────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Controller App      Participant App      Participant App
   (Triggers patterns) (Flashlight sync)   (Flashlight sync)
```

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Mobile     | React Native + Expo                               |
| Server     | Node.js + Express + Socket.io                     |
| Database   | PostgreSQL (production) / In-memory (development) |
| Flashlight | expo-camera (torch mode)                          |
| Location   | expo-location                                     |

## Project Structure

```
stadium-lights/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── app/                # Expo Router screens
│   │   │   ├── index.tsx       # Home screen
│   │   │   ├── controller.tsx  # Controller UI
│   │   │   ├── participant.tsx # Participant UI
│   │   │   └── my-groups.tsx   # Group management
│   │   └── src/
│   │       ├── components/     # React components
│   │       ├── services/       # Socket, Location, Flashlight
│   │       ├── patterns/       # Pattern executor
│   │       └── interfaces/     # TypeScript interfaces
│   │
│   └── server/                 # Node.js backend
│       ├── src/
│       │   ├── handlers/       # Socket event handlers
│       │   ├── services/       # Business logic
│       │   ├── patterns/       # Pattern generators
│       │   ├── repositories/   # Data access layer
│       │   └── db/             # Database migrations
│       └── public/             # Static files (visualizer, privacy)
│
├── packages/
│   └── shared/                 # Shared types and utilities
│       └── src/
│           ├── types/          # TypeScript types
│           └── utils/          # Validation utilities
│
└── .documents/                 # Feature planning documents
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- iOS Simulator / Android Emulator (or physical device)
- PostgreSQL (optional, for persistent storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/sitetransition/stadium-lights.git
cd stadium-lights

# Install dependencies
npm install

# Build shared package
npm run build -w @stadium-lights/shared
```

### Running Locally

**Start the server:**
```bash
# Development mode (in-memory storage)
npm run dev -w @stadium-lights/server

# Or with PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/stadium_lights npm run dev -w @stadium-lights/server
```

**Start the mobile app:**
```bash
cd apps/mobile

# Create .env file
echo "EXPO_PUBLIC_SERVER_URL=http://YOUR_LOCAL_IP:3000" > .env

# Start Expo
npx expo start
```

**Open the visualizer:**
```
http://localhost:3000/visualizer
```

### Testing Patterns

1. Create a group in the mobile app (Controller role)
2. Open `http://localhost:3000/visualizer` in a browser
3. Enter the group code
4. Trigger patterns from the app to see them animate

## Configuration

### Server Environment Variables

| Variable          | Description                              | Default       |
|-------------------|------------------------------------------|---------------|
| `PORT`            | Server port                              | `3000`        |
| `DATABASE_URL`    | PostgreSQL connection string             | (in-memory)   |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated)           | `*`           |
| `NODE_ENV`        | Environment (`development`/`production`) | `development` |

### Mobile Environment Variables

| Variable                 | Description                      |
|--------------------------|----------------------------------|
| `EXPO_PUBLIC_SERVER_URL` | Server URL for socket connection |

For production builds, these are configured in `eas.json`.

## Deployment

### Server (Railway)

1. Connect GitHub repository to Railway
2. Set root directory: `apps/server`
3. Add PostgreSQL database
4. Configure environment variables:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
5. Add custom domain

### Mobile (EAS)

```bash
cd apps/mobile

# Build for app stores
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Socket Events

### Client → Server

| Event             | Payload                                               | Description                 |
|-------------------|-------------------------------------------------------|-----------------------------|
| `create_group`    | `{ deviceId, stadiumBounds, gridSize?, customCode? }` | Create a new group          |
| `join_group`      | `{ code, deviceId, displayName }`                     | Join existing group         |
| `update_location` | `{ latitude, longitude }`                             | Update participant position |
| `trigger_pattern` | `{ patternId, config? }`                              | Start a pattern             |
| `update_pattern`  | `{ config }`                                          | Update running pattern      |
| `stop_pattern`    | -                                                     | Stop current pattern        |
| `resume_group`    | `{ deviceId, groupId }`                               | Resume controller session   |
| `release_group`   | `{ deviceId, groupId }`                               | End group permanently       |

### Server → Client

| Event               | Payload                                                 | Description                |
|---------------------|---------------------------------------------------------|----------------------------|
| `group_created`     | `{ groupId, code, expiresAt }`                          | Group created confirmation |
| `group_joined`      | `{ groupId, zoneId, participantCount, activePattern? }` | Join confirmation          |
| `pattern_start`     | `{ patternId, schedule, duration, startTime }`          | Pattern execution data     |
| `pattern_stop`      | -                                                       | Pattern stopped            |
| `participant_count` | `{ count, zoneDistribution }`                           | Updated participant stats  |
| `zone_updated`      | `{ zoneId }`                                            | Participant zone changed   |
| `time_sync`         | `{ serverTime }`                                        | Server timestamp for sync  |

## Patterns

| Pattern            | Description                                                |
|--------------------|------------------------------------------------------------|
| **Random Sparkle** | Random zones flash creating a twinkling effect             |
| **Wave**           | Light sweeps across the stadium horizontally or vertically |
| **Pulse**          | Light expands outward from the center                      |
| **Strobe**         | All lights flash together in sync                          |
| **Chase**          | Light chases sequentially through zones                    |
| **Spiral**         | Light spirals inward or outward                            |
| **Checkerboard**   | Alternating grid pattern                                   |
| **Alternating**    | Odd/even zones alternate                                   |

## Security

- Input validation on all socket events
- Rate limiting: 100 HTTP requests/min, 50 socket events/10sec
- CORS restriction in production
- No sensitive data stored (location data is session-only)

## Privacy

Stadium Lights collects location data only during active sessions to determine zone positioning. Data is not persisted after groups expire. See `/privacy` endpoint for full privacy policy.


