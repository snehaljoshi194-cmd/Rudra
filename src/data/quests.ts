import { DailyQuest, DailyQuestState, DailyQuestType, RunResult } from '../types/game';

interface QuestTemplate {
  type: DailyQuestType;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
}

const QUEST_POOL: QuestTemplate[] = [
  {
    type: 'coins_single_run',
    title: 'Himalayan Hoarder',
    description: 'Collect 500 coins in one run',
    target: 500,
    rewardCoins: 450,
  },
  {
    type: 'complete_levels',
    title: 'Pass Conqueror',
    description: 'Complete 3 levels',
    target: 3,
    rewardCoins: 500,
  },
  {
    type: 'collect_biome_relics',
    title: 'Sacred Relic Seeker',
    description: 'Collect 12 Biome Relic coins across runs',
    target: 12,
    rewardCoins: 400,
  },
  {
    type: 'total_distance',
    title: 'High-Altitude Marathon',
    description: 'Drive 2,000 meters across Leh Ladakh',
    target: 2000,
    rewardCoins: 380,
  },
  {
    type: 'use_powerups',
    title: 'Turbo Expedition',
    description: 'Pick up 4 power-ups (Magnet, Shield, 2x, Nitro)',
    target: 4,
    rewardCoins: 350,
  },
  {
    type: 'jumps_and_slides',
    title: 'Acrobatic Rider',
    description: 'Perform 20 jumps or slides over hazards',
    target: 20,
    rewardCoins: 320,
  },
  {
    type: 'earn_three_stars',
    title: 'Golden Stupa Mastery',
    description: 'Earn a 3-Star clear on any level',
    target: 1,
    rewardCoins: 550,
  },
];

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimeUntilMidnightLabel(now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function hashDateKey(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateDailyQuests(dateKey = getTodayDateKey()): DailyQuestState {
  const seed = hashDateKey(dateKey);
  const poolCopy = [...QUEST_POOL];

  // Deterministic Fisher-Yates shuffle using LCG from date seed
  let state = seed || 1;
  for (let i = poolCopy.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = poolCopy[i];
    poolCopy[i] = poolCopy[j];
    poolCopy[j] = tmp;
  }

  // Always pick 3 distinct challenges; ensure at least one marquee challenge appears prominently
  const picked = poolCopy.slice(0, 3);
  const quests: DailyQuest[] = picked.map((tpl, idx) => ({
    id: `${dateKey}_${tpl.type}_${idx}`,
    type: tpl.type,
    title: tpl.title,
    description: tpl.description,
    target: tpl.target,
    progress: 0,
    rewardCoins: tpl.rewardCoins,
    claimed: false,
  }));

  return { dateKey, quests };
}

export function applyRunToDailyQuests(
  questState: DailyQuestState,
  result: RunResult
): { nextState: DailyQuestState; newlyCompleted: DailyQuest[] } {
  const today = getTodayDateKey();
  const base =
    questState.dateKey === today && questState.quests.length > 0
      ? questState
      : generateDailyQuests(today);

  const newlyCompleted: DailyQuest[] = [];

  const nextQuests = base.quests.map((q) => {
    if (q.progress >= q.target) return q;

    let nextProgress = q.progress;
    switch (q.type) {
      case 'coins_single_run':
        nextProgress = Math.max(q.progress, Math.min(q.target, result.rawCoinsCollected));
        break;
      case 'complete_levels':
        if (result.won) nextProgress = Math.min(q.target, q.progress + 1);
        break;
      case 'collect_biome_relics':
        nextProgress = Math.min(q.target, q.progress + result.coinBreakdown.biome);
        break;
      case 'total_distance':
        nextProgress = Math.min(q.target, q.progress + result.distance);
        break;
      case 'use_powerups':
        nextProgress = Math.min(q.target, q.progress + result.powerupsCollected);
        break;
      case 'jumps_and_slides':
        nextProgress = Math.min(
          q.target,
          q.progress + result.jumpsPerformed + result.slidesPerformed
        );
        break;
      case 'earn_three_stars':
        if (result.won && result.starsEarned >= 3) {
          nextProgress = q.target;
        }
        break;
    }

    const updated = { ...q, progress: nextProgress };
    if (q.progress < q.target && updated.progress >= updated.target) {
      newlyCompleted.push(updated);
    }
    return updated;
  });

  return {
    nextState: { dateKey: today, quests: nextQuests },
    newlyCompleted,
  };
}
