// The questionnaire. Question ids are permanent: never rename or reuse one.
// To change the questionnaire later, add new ids and bump SCHEMA_VERSION.
export const SCHEMA_VERSION = 1;

export const EMOTIONS = [
  { id: 'happy', face: '😊', label: 'Happy' },
  { id: 'excited', face: '🤩', label: 'Excited' },
  { id: 'calm', face: '😌', label: 'Calm' },
  { id: 'loving', face: '🥰', label: 'Loving' },
  { id: 'tired', face: '😴', label: 'Tired' },
  { id: 'bored', face: '😐', label: 'Bored' },
  { id: 'sad', face: '😢', label: 'Sad' },
  { id: 'anxious', face: '😰', label: 'Anxious' },
  { id: 'stressed', face: '😫', label: 'Stressed' },
  { id: 'angry', face: '😠', label: 'Angry' },
];

const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

// Slider answers are stored as 0-100. `from0: true` means the scale starts at
// "nothing" (thumb starts on the left); otherwise it starts in the middle and
// must be touched before moving on.
export const FORMS = {
  morning: [
    { id: 'mood', type: 'slider', title: 'How are you feeling right now?', lo: 'Unpleasant', hi: 'Pleasant' },
    { id: 'energy', type: 'slider', title: 'How is your energy?', lo: 'Drained', hi: 'Wired' },
    { id: 'emotion', type: 'faces', title: 'Which emotion is strongest right now?' },
    { id: 'sleep', type: 'slider', title: 'How did you sleep?', lo: 'Terribly', hi: 'Perfectly' },
    { id: 'sex_night', type: 'choice', title: 'Did you have sex during the night?', options: YES_NO },
    { id: 'day_type', type: 'choice', title: 'What kind of day is today?', options: [
      { id: 'work', label: 'Work' }, { id: 'study', label: 'Study' }, { id: 'off', label: 'Day off' },
    ] },
  ],
  night: [
    { id: 'mood', type: 'slider', title: 'How are you feeling right now?', lo: 'Unpleasant', hi: 'Pleasant' },
    { id: 'energy', type: 'slider', title: 'How is your energy?', lo: 'Drained', hi: 'Wired' },
    { id: 'emotion', type: 'faces', title: 'Which emotion is strongest right now?' },
    { id: 'emotion_day', type: 'faces', title: 'Which emotion was strongest today?' },
    { id: 'stress', type: 'slider', title: 'How stressful was today?', lo: 'Not at all', hi: 'Extremely', from0: true },
    { id: 'social', type: 'slider', title: 'How much time did you spend with people?', lo: 'Alone all day', hi: 'With people all day', from0: true },
    { id: 'food', type: 'slider', title: 'How well did you eat today?', lo: 'Badly', hi: 'Very well' },
    { id: 'exercise', type: 'slider', title: 'How much did you exercise today?', lo: 'Not at all', hi: 'Hard workout', from0: true },
    { id: 'outside', type: 'slider', title: 'How much time did you spend outside?', lo: 'None', hi: 'Most of the day', from0: true },
    { id: 'hobby', type: 'choice', title: 'Did you do any hobbies today?', options: YES_NO },
    { id: 'alcohol', type: 'slider', title: 'How much did you drink today?', lo: 'Nothing', hi: 'A lot', from0: true },
    { id: 'drugs', type: 'choice', title: 'Did you take any drugs today?', options: [
      { id: 'none', label: 'None' }, { id: 'cannabis', label: 'Cannabis' }, { id: 'other', label: 'Other' }, { id: 'both', label: 'Cannabis + other' },
    ] },
    { id: 'nap', type: 'choice', title: 'Did you nap today?', options: YES_NO },
    { id: 'sex_day', type: 'choice', title: 'Did you have sex during the day?', options: YES_NO },
  ],
};
