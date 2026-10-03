export type LobbyStatus = "lobby" | "drawing" | "voting" | "results";

/** A single pen stroke in logical space (1000 x 625). */
export type Stroke = {
  /** colour, hex string */
  c: string;
  /** line width in logical units */
  w: number;
  /** flattened x,y pairs in logical units */
  p: number[];
  /** eraser stroke */
  e?: boolean;
};

export type PlayerState = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  color: number;
  online: boolean;
  submitted: boolean;
  voted: boolean;
  isYou: boolean;
};

export type DrawingState = {
  id: string;
  playerId: string;
  authorName: string;
  authorColor: number;
  strokes: Stroke[];
  isYours: boolean;
  displayOrder: number;
  voteCount: number;
  voters: string[];
  myVote: boolean;
};

export type LobbySettings = {
  drawSeconds: number;
  voteSeconds: number;
  promptPack: string;
  customPrompts: string[];
};

export type LobbyState = {
  code: string;
  status: LobbyStatus;
  round: number;
  rev: number;
  prompt: string | null;
  phaseEndsAt: number | null;
  serverNow: number;
  settings: LobbySettings;
  you: { id: string; name: string; isHost: boolean; color: number } | null;
  players: PlayerState[];
  drawings: DrawingState[];
  myDrawingId: string | null;
  myVoteId: string | null;
  submittedCount: number;
  votedCount: number;
  winnerBonus: number;
  totals: { playerId: string; name: string; score: number; color: number }[];
  roundWinners: string[];
  playerCount: number;
};

export type Session = {
  code: string;
  playerId: string;
  token: string;
  name: string;
};
