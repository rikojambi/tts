export type Difficulty = 'mudah' | 'sedang' | 'sulit';
export type Direction = 'across' | 'down';

export interface Question {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
}

export interface WordInput {
  id: string;
  answer: string;
  clue: string;
}

export interface PlacedWord {
  id: string;
  answer: string;
  clue: string;
  number: number;
  row: number;
  col: number;
  direction: Direction;
}

export interface CrosswordPuzzle {
  id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  width: number;
  height: number;
  /** null = blocked cell */
  grid: (string | null)[][];
  words: PlacedWord[];
  unplaced: WordInput[];
}

export interface GenerationOptions {
  title?: string;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty;
  attempts?: number;
  seed?: number;
  minCrossings?: number;
}

export interface Level {
  id: number;
  title: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  targetScore: number;
  xp: number;
  coins: number;
  questions: Question[];
}

export interface LevelResult {
  levelId: number;
  stars: number;
  score: number;
  correct: number;
  total: number;
  durationMs: number;
  playedAt: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  coins: number;
  streak: number;
  lastPlayedDate: string | null;
  createdAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardXp: number;
  rewardCoins: number;
  condition: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalCorrect: number;
  totalGames: number;
  totalLevelsCleared: number;
  maxStreak: number;
  maxScore: number;
  battleWins: number;
}

export type PowerUpId = 'hint' | 'extraTime' | 'doubleXp';

export interface PowerUp {
  id: PowerUpId;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export interface InventoryItem {
  id: PowerUpId;
  qty: number;
}

export interface GameRecord {
  id: string;
  mode: 'quick' | 'adventure' | 'battle' | 'daily' | 'arena';
  subject: string;
  score: number;
  correct: number;
  total: number;
  durationMs: number;
  playedAt: number;
  levelId?: number;
  details?: Record<string, unknown>;
}

export interface AnswerEvent {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  groupId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  durationMs: number;
  points: number;
}

export interface BattleGroup {
  id: string;
  name: string;
  members: { id: string; name: string }[];
  score: number;
  color: string;
}

export interface BattleConfig {
  groups: BattleGroup[];
  questionIds: string[];
  secondsPerTurn: number;
  pointsPerCorrect: number;
  skipPenalty: number;
  passesEnabled: boolean;
}

export interface BattleState {
  config: BattleConfig;
  questionIndex: number;
  groupIndex: number;
  /** Indeks anggota berikutnya untuk setiap kelompok. */
  memberCursor: Record<string, number>;
  events: AnswerEvent[];
  finished: boolean;
  startedAt: number;
  turnCount: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  subjectIds: string[];
}

export interface SyncStatus {
  state: 'offline' | 'syncing' | 'online' | 'error' | 'disabled';
  lastSync: number | null;
  message: string;
  pending: number;
}

export interface DailyChallenge {
  date: string;
  title: string;
  questionIds: string[];
  rewardMultiplier: number;
}

export interface ArenaQuestion {
  id: string;
  question: Question;
  options: string[];
  correctIndex: number;
}
