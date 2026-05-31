<div align="center">
  <img src="public/screenshots/chat.png" alt="ChatterBox Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />
</div>

<h1 align="center">ChatterBox</h1>

<p align="center">
  Real-time chat app with group rooms, DMs, media sharing, and live presence.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.1-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Express.js-5-000000?style=flat-square&logo=express" alt="Express.js" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

## Features

### Messaging
- **Group rooms** — create or join rooms with 6-digit codes, optional expiry and participant limits.
- **Direct messages** — private conversations with friends.
- **Typing indicators** — see when someone's typing.
- **Read receipts** — "Sent" / "Seen" on messages.
- **Message deletion** — delete your own messages; room creators can delete anything.

### Users & Friends
- **JWT auth** — signup, login, session management.
- **Friend codes** — add people via 8-char alphanumeric codes.
- **Friend requests** — send, accept, reject with real-time notifs.
- **Online presence** — see who's online.

### Media
- **Image uploads** — send pics in chat.
- **Voice messages** — record and send audio (browser MediaRecorder API).
- **GPS location** — share your location via Geolocation API.

### Security
- **Anti-screenshot** — disables right-click, PrintScreen, DevTools shortcuts.
- **Watermark overlay** — invisible background pattern to deter captures.
- **Session rooms** — rooms auto-expire (5 min – 24 hr).

### UI
- **Dark & light themes** — toggles with `next-themes`.
- **Glassmorphism** — frosted-glass look with gradients.
- **Responsive sidebar** — collapses to icons (Ctrl+B), hamburger on mobile.
- **Animations** — smooth transitions, glow shadows, loading skeletons.

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td><img src="public/screenshots/landing.png" alt="Landing Page" width="400" /></td>
      <td><img src="public/screenshots/signup.png" alt="Signup Page" width="400" /></td>
    </tr>
    <tr>
      <td align="center"><em>Landing Page</em></td>
      <td align="center"><em>Signup</em></td>
    </tr>
    <tr>
      <td><img src="public/screenshots/home.png" alt="Home Page" width="400" /></td>
      <td><img src="public/screenshots/chat.png" alt="Chat Dashboard" width="400" /></td>
    </tr>
    <tr>
      <td align="center"><em>Home / Dashboard</em></td>
      <td align="center"><em>Chat Dashboard</em></td>
    </tr>
    <tr>
      <td><img src="public/screenshots/room.png" alt="Chat Room" width="800" colspan="2" /></td>
    </tr>
    <tr>
      <td align="center" colspan="2"><em>Group Chat Room</em></td>
    </tr>
  </table>
</div>

---

## Tech Stack

| Layer | What I used |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **Backend** | Express.js 5, Socket.IO 4, Node.js |
| **Database** | MongoDB + Mongoose 9 |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Real-Time** | Socket.IO (WebSocket with JWT auth middleware) |
| **Media** | Multer (file uploads), MediaRecorder API (voice), Geolocation API (location) |
| **Dev Tools** | ESLint 9, PostCSS, tsx, Babel React Compiler, tw-animate-css |

---

## Project Structure

```
chatterbox/
├── server/
│   └── index.ts            # Express + Socket.IO server (port 3001)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Login & signup pages
│   │   ├── chatterbox/     # Authenticated app (chat, settings, join-room)
│   │   ├── api/            # REST API routes (auth, users, rooms, messages, friends, DMs)
│   │   └── docs/           # Application documentation
│   ├── components/
│   │   ├── ui/             # shadcn/ui components + chat, sidebar, etc.
│   │   ├── sections/       # Landing page sections (navbar, hero)
│   │   └── logos/          # SVG logo components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (auth, DB connection, API middleware)
│   └── model/              # Mongoose models (User, Room, Message, FriendRequest)
└── uploads/                # User-uploaded files (images, audio)
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/Priyanshuuk/chatterbox.git
cd chatterbox

# Install deps
npm install

# Set up .env with your MongoDB URI and JWT secret:
#   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/chatapp
#   JWT_SECRET=<your-secret-key>

# Start both Next.js and Socket.IO server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both Next.js and Socket.IO server in dev mode |
| `npm run dev:next` | Start only Next.js |
| `npm run dev:socket` | Start only Socket.IO server with hot-reload |
| `npm run build` | Build Next.js for production |
| `npm run start` | Run production build + Socket.IO server |
| `npm run lint` | Run ESLint |

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Clear session |

### Users & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Get current user |
| PATCH | `/api/user` | Update profile (username, avatar) |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a group room |
| GET | `/api/rooms/list` | List your group rooms |
| POST | `/api/rooms/join` | Join a room by code |
| GET | `/api/room/members` | Get room participants |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | Get messages for a room |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | List friends |
| POST | `/api/friends/search` | Search users by friend code |
| POST | `/api/friends/request` | Send a friend request |
| GET | `/api/friends/requests` | Get pending requests |
| POST | `/api/friends/respond` | Accept or reject a request |

### Direct Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dm/list` | List DM conversations |
| POST | `/api/dm/start` | Start a new DM |
| DELETE | `/api/dm/delete` | Delete a DM conversation |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `create-room` | Client → Server | Create a room |
| `join-room` | Client → Server | Join a room |
| `leave-room` | Client → Server | Leave a room |
| `send-message` | Client → Server | Send a chat message |
| `delete-message` | Client → Server | Delete a message |
| `typing` / `stop-typing` | Client → Server | Typing indicators |
| `remove-user` | Client → Server | Kick a user (room creator only) |
| `delete-room` | Client → Server | Delete a room (creator only) |
| `new-message` | Server → Client | Incoming message |
| `message-deleted` | Server → Client | Message removed |
| `user-joined` / `user-left` | Server → Client | Room presence updates |
| `friend-request` / `friend-request-accepted` | Server → Client | Friend request notifications |
| `friend-chat-invite` | Server → Client | Invite to join a chat room |

---

## Contributing

PRs and issues are welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/whatever`)
3. Commit your changes (`git commit -m 'Add whatever'`)
4. Push to the branch (`git push origin feature/whatever`)
5. Open a Pull Request


