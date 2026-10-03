// The Doodle Riot database layer has moved to Firebase Cloud Firestore.
// See src/lib/firebase.ts and src/lib/server/engine.ts for the data model:
//
//   lobbies/{code}                — lobby doc (status, round, prompt, timers, rev)
//   lobbies/{code}/players/{id}   — player seat (name, token, score, presence)
//   lobbies/{code}/drawings/{id}  — round drawings (strokes, display order)
//   lobbies/{code}/votes/{id}     — one ballot per voter per round
//
// This file is kept as a marker for tooling (drizzle.config.json).

export {};
