/** Hero colour mood follows Bali time. Shared by the inline pre-paint script and the shader island. */
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export const PHASE_COLORS: Record<Phase, [string, string, string, string]> = {
  dawn: ['#f9c9a7', '#f3a0a8', '#fde9c9', '#c9b7e8'],
  day: ['#fbe38e', '#9fd9c9', '#f8f1e3', '#f6a9c4'],
  dusk: ['#f39a5d', '#e8607a', '#f8c978', '#7b3f93'],
  night: ['#1b1430', '#4a2a6a', '#0f3b4a', '#b4527a'],
};

export const PHASE_LABEL: Record<Phase, string> = {
  dawn: 'Sunrise in Bali',
  day: 'Daytime in Bali',
  dusk: 'Sunset in Bali',
  night: 'Night in Bali',
};

/** minutes since Bali midnight → phase */
export const phaseAt = (m: number): Phase => (m < 300 ? 'night' : m < 540 ? 'dawn' : m < 960 ? 'day' : m < 1140 ? 'dusk' : 'night');
