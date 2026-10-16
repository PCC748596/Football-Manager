
export interface Impact {
  label: string;
  value: number;
}

export interface TrainingActivity {
  id: string;
  name: string;
  category: 'DEFENSE' | 'MIDFIELD' | 'ATTACK' | 'TACTICS' | 'FITNESS';
  icon: string;
  impacts: Impact[];
}

export const ACTIVITIES: TrainingActivity[] = [
  // DEFENSE
  { id: 'tackling', name: 'Tackling', category: 'DEFENSE', icon: '👟', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'marking', name: 'Man Marking', category: 'DEFENSE', icon: '🛡️', impacts: [{ label: 'DEF', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'def_pos', name: 'Def. Shape', category: 'DEFENSE', icon: '🧱', impacts: [{ label: 'DEF', value: 0.5 }, { label: 'MOR', value: 5 }, { label: 'STM', value: -1 }] },
  { id: 'aerial', name: 'Aerial Duels', category: 'DEFENSE', icon: '✈️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -2 }] },

  // MIDFIELD
  { id: 'passing', name: 'Passing', category: 'MIDFIELD', icon: '🔄', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'control', name: 'Ball Control', category: 'MIDFIELD', icon: '⚽', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'vision', name: 'Vision', category: 'MIDFIELD', icon: '👁️', impacts: [{ label: 'PAS', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'playmaking', name: 'Playmaking', category: 'MIDFIELD', icon: '🧠', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'DRB', value: 0.5 }, { label: 'STM', value: -2 }] },

  // ATTACK
  { id: 'shooting', name: 'Shooting', category: 'ATTACK', icon: '🎯', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'finishing', name: '1v1 Finish', category: 'ATTACK', icon: '🥅', impacts: [{ label: 'SHT', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'crossing', name: 'Crossing', category: 'ATTACK', icon: '⤴️', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'wingplay', name: 'Wing Play', category: 'ATTACK', icon: '🏃', impacts: [{ label: 'DRB', value: 1.5 }, { label: 'STM', value: -2 }] },

  // TACTICS
  { id: 'video', name: 'Analysis', category: 'TACTICS', icon: '📺', impacts: [{ label: 'ENT', value: 0.5 }] },
  { id: 'setpieces', name: 'Set Pieces', category: 'TACTICS', icon: '🚩', impacts: [{ label: 'SHT', value: 0.5 }, { label: 'PAS', value: 0.5 }, { label: 'STM', value: -1 }] },
  { id: 'pressing', name: 'Pressing', category: 'TACTICS', icon: '😤', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -3 }] },
  { id: 'shadow', name: 'Shadow Play', category: 'TACTICS', icon: '👥', impacts: [{ label: 'MOR', value: 1.0 }, { label: 'STM', value: -1 }] },

  // FITNESS
  { id: 'cardio', name: 'Cardio', category: 'FITNESS', icon: '🫁', impacts: [{ label: 'FIT', value: 2.0 }, { label: 'STM', value: -2 }] },
  { id: 'strength', name: 'Gym Work', category: 'FITNESS', icon: '🏋️', impacts: [{ label: 'FIT', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'sprints', name: 'Sprints', category: 'FITNESS', icon: '⚡', impacts: [{ label: 'FIT', value: 1.0 }, { label: 'STM', value: -3 }] },
  { id: 'recovery', name: 'Recovery', category: 'FITNESS', icon: '🩹', impacts: [{ label: 'FIT', value: 3.0 }, { label: 'MOR', value: 1.0 }] },
];
