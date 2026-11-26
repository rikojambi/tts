import type { AnswerEvent, BattleConfig, BattleGroup, BattleState } from '@/types';

export function createBattleState(config: BattleConfig, now = Date.now()): BattleState {
  if (config.groups.length === 0) throw new Error('Minimal satu kelompok diperlukan');
  return {
    config,
    questionIndex: 0,
    groupIndex: 0,
    memberCursor: Object.fromEntries(config.groups.map((group) => [group.id, 0])),
    events: [],
    finished: false,
    startedAt: now,
    turnCount: 0,
  };
}

export interface TurnInfo {
  group: BattleGroup;
  member: { id: string; name: string };
  questionId: string;
}

export function getTurn(state: BattleState): TurnInfo | null {
  if (state.finished) return null;
  const group = state.config.groups[state.groupIndex];
  const questionId = state.config.questionIds[state.questionIndex];
  if (!group || !questionId || group.members.length === 0) return null;
  const cursor = state.memberCursor[group.id] ?? 0;
  const member = group.members[cursor % group.members.length]!;
  return { group, member, questionId };
}

interface SubmitInput {
  playerId: string;
  playerName: string;
  groupId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  durationMs: number;
  points: number;
  timestamp?: number;
}

export function submitBattleAnswer(state: BattleState, input: SubmitInput): BattleState {
  const turn = getTurn(state);
  if (!turn) return state;
  if (input.groupId !== turn.group.id || input.playerId !== turn.member.id || input.questionId !== turn.questionId) {
    return state; // Menolak jawaban di luar giliran.
  }
  const event: AnswerEvent = {
    id: crypto.randomUUID(),
    timestamp: input.timestamp ?? Date.now(),
    playerId: input.playerId,
    playerName: input.playerName,
    groupId: input.groupId,
    questionId: input.questionId,
    answer: input.answer,
    correct: input.correct,
    durationMs: Math.max(0, input.durationMs),
    points: input.correct ? Math.max(0, input.points) : 0,
  };
  return advanceTurn({ ...state, events: [...state.events, event] });
}

export function skipBattleTurn(state: BattleState, timestamp = Date.now()): BattleState {
  const turn = getTurn(state);
  if (!turn) return state;
  const penalty = state.config.skipPenalty;
  const event: AnswerEvent = {
    id: crypto.randomUUID(),
    timestamp,
    playerId: turn.member.id,
    playerName: turn.member.name,
    groupId: turn.group.id,
    questionId: turn.questionId,
    answer: '',
    correct: false,
    durationMs: 0,
    points: -penalty,
  };
  return advanceTurn({ ...state, events: [...state.events, event] });
}

function advanceTurn(state: BattleState): BattleState {
  const groupCount = state.config.groups.length;
  const nextGroupIndex = (state.groupIndex + 1) % groupCount;
  const wrapped = nextGroupIndex === 0;
  const nextQuestionIndex = wrapped ? state.questionIndex + 1 : state.questionIndex;
  const currentGroup = state.config.groups[state.groupIndex]!;
  const cursor = state.memberCursor[currentGroup.id] ?? 0;
  const memberCursor = {
    ...state.memberCursor,
    [currentGroup.id]: cursor + 1,
  };
  const finished = nextQuestionIndex >= state.config.questionIds.length;
  return {
    ...state,
    groupIndex: nextGroupIndex,
    questionIndex: nextQuestionIndex,
    memberCursor,
    turnCount: state.turnCount + 1,
    finished,
  };
}

export function leaderboard(state: BattleState) {
  return state.config.groups
    .map((group) => {
      const events = state.events.filter((event) => event.groupId === group.id);
      return {
        id: group.id,
        name: group.name,
        color: group.color,
        score: events.reduce((sum, event) => sum + event.points, 0),
        correct: events.filter((event) => event.correct).length,
        total: events.length,
        members: group.members.map((member) => {
          const memberEvents = events.filter((event) => event.playerId === member.id);
          return {
            id: member.id,
            name: member.name,
            score: memberEvents.reduce((sum, event) => sum + event.points, 0),
            correct: memberEvents.filter((event) => event.correct).length,
            attempts: memberEvents.length,
          };
        }),
      };
    })
    .sort((a, b) => b.score - a.score);
}
