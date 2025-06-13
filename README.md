# Whot Card Game

A classic Whot card game implemented using Next.js, featuring advanced real-time multiplayer capabilities through Cloudflare agents and durable objects.

## Technologies Used

- **Next.js**: A React framework for building server-rendered applications, providing a robust foundation for the frontend.
- **Cloudflare Workers**: Serverless computing platform used for backend logic, including game AI and room management.
- **Cloudflare Durable Objects**: Stateful objects for persistent storage, crucial for maintaining game room states.
- **WebSockets**: Protocol for real-time, bidirectional communication between clients and servers, essential for multiplayer synchronization.
- **PWSDORS (Persistent WebSocket Durable Object Room System)**: A custom system for persistent, real-time multiplayer rooms, leveraging WebSockets and Durable Objects.

## Technical Overview

### Architecture
- **Frontend**: Next.js application handling user interface and interactions.
- **Backend**: Cloudflare Workers managing game logic, AI, and room persistence via Durable Objects.
- **Real-Time Communication**: WebSockets ensuring instant updates and synchronization across players.

### Features
- **Multiplayer Mode**: Real-time play against friends with synchronized game states.
- **AI Opponent**: Advanced AI for single-player mode, implemented using Cloudflare agents.
- **Persistent Rooms**: Rooms that maintain state even after player disconnection, allowing seamless rejoining.
- **State Synchronization**: Ensures all players have a consistent view of the game state.

### PWSDORS Explanation
PWSDORS (Persistent WebSocket Durable Object Room System) is a proof of concept developed by [Prof oz](https://x.com/oziprof/status/1928960204827406596). It uses WebSockets for real-time communication and Cloudflare Durable Objects to create and manage persistent rooms. Each room can have multiple members, and their states are synchronized in real-time. This system is crucial for enabling multiplayer features in the Whot card game, allowing players to join rooms, play together, and have their game states consistently updated across all participants.

## Getting Started

### Prerequisites
- Node.js
- npm, yarn, pnpm, or bun

### Setup
1. Clone the repository:

```bash
git clone https://github.com/0xPr0f/whottos.git
```

2. Navigate to the project directory:

```bash
cd whottos
```

3. Install dependencies:

```bash
pnpm install  # or yarn, npm, bun
```

4. Start the development server:
```bash

pnpm dev  # or yarn dev, npm run dev, bun dev
```

5. Open http://localhost:3000 in your browser.

