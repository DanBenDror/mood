// The questionnaire. Question ids are permanent: never rename or reuse one.
// To change the questionnaire, add new ids and bump SCHEMA_VERSION.
//
// History
//   v1 (2026-11-12): first version.
//   v2 (2026-11-13): morning `sex_night` (yes/no) replaced by `slept_with`; morning `health` added;
//                    night `sex_day` removed; night `alcohol` (0-100 slider) replaced by `drinks` (count).
export const SCHEMA_VERSION = 2;

export const EMOTIONS = [
  { id: 'happy', label: 'Happy' },
  { id: 'excited', label: 'Excited' },
  { id: 'calm', label: 'Calm' },
  { id: 'loving', label: 'Loving' },
  { id: 'tired', label: 'Tired' },
  { id: 'bored', label: 'Bored' },
  { id: 'sad', label: 'Sad' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'stressed', label: 'Stressed' },
  { id: 'angry', label: 'Angry' },
];

const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

// Slider answers are stored as 0-100. `from0: true` means the scale starts at
// "nothing" (thumb starts on the left); otherwise it starts in the middle and
// must be touched before moving on. `icons` questions show one drawing per
// option (`art` names a drawing in js/faces.js). Drawings are shown without
// captions; `label` is only used for screen readers.
export const FORMS = {
  morning: [
    { id: 'mood', type: 'slider', title: 'How are you feeling right now?', lo: 'Unpleasant', hi: 'Pleasant' },
    { id: 'energy', type: 'slider', title: 'How is your energy?', lo: 'Drained', hi: 'Wired' },
    { id: 'emotion', type: 'faces', title: 'Which emotion is strongest right now?' },
    { id: 'sleep', type: 'slider', title: 'How did you sleep?', lo: 'Terribly', hi: 'Perfectly' },
    { id: 'slept_with', type: 'icons', title: 'Did you sleep with someone?', options: [
      { id: 'alone', label: 'Alone', art: 'bed_one' },
      { id: 'shared', label: 'Shared a bed', art: 'bed_two' },
      { id: 'sex', label: 'Had sex', art: 'bed_heart' },
    ] },
    { id: 'health', type: 'icons', title: 'How is your health today?', options: [
      { id: 'sick', label: 'Sick', art: 'health_sick' },
      { id: 'unwell', label: 'Under the weather', art: 'health_dizzy' },
      { id: 'healthy', label: 'Healthy', art: 'health_good' },
    ] },
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
    { id: 'drinks', type: 'icons', title: 'How many drinks did you have today?', options: [
      { id: '0', label: 'None', art: 'drinks_0' }, { id: '1-2', label: '1 to 2', art: 'drinks_1' }, { id: '3-4', label: '3 to 4', art: 'drinks_2' },
      { id: '5-6', label: '5 to 6', art: 'drinks_3' }, { id: '7+', label: '7 or more', art: 'drinks_4' },
    ] },
    { id: 'drugs', type: 'choice', title: 'Did you take any drugs today?', options: [
      { id: 'none', label: 'None' }, { id: 'cannabis', label: 'Cannabis' }, { id: 'other', label: 'Other' }, { id: 'both', label: 'Cannabis + other' },
    ] },
    { id: 'nap', type: 'choice', title: 'Did you nap today?', options: YES_NO },
  ],
};
