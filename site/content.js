export const strings = [
  { name: 'G', octave: 4, midi: 67 },
  { name: 'C', octave: 4, midi: 60 },
  { name: 'E', octave: 4, midi: 64 },
  { name: 'A', octave: 4, midi: 69 },
];

export const chords = {
  C: {
    name: 'C major',
    shape: [null, null, null, [3, 3]],
    tip: 'Let your ring finger curl so it presses the A string with its tip.',
  },
  Am: {
    name: 'A minor',
    shape: [[2, 2], null, null, null],
    tip: 'Use just your middle finger. Leave room beneath it for the C string to ring.',
  },
  F: {
    name: 'F major',
    shape: [[2, 2], null, [1, 1], null],
    tip: 'Start from Am. Keep your middle finger in place and add your index finger on the E string.',
  },
  G7: {
    name: 'G dominant seventh',
    shape: [null, [2, 2], [1, 1], [2, 3]],
    tip: 'Place your index finger first, then add your middle and ring fingers on either side.',
  },
  G: {
    name: 'G major',
    shape: [null, [2, 1], [3, 3], [2, 2]],
    tip: 'Place your index and middle fingers at fret 2. Reach your ring finger one fret farther on the E string.',
  },
};

export const songs = {
  'first-changes': {
    name: 'First chord changes',
    beats: '1 · 2 · 3 · 4',
    intro: 'Play one downstroke on each count. Give yourself time to move to the next chord, then repeat without pausing.',
    next: 'Once that feels steady, add a light upstroke on each “and” as you count “one and two and three and four and.”',
    measures: [
      ['C', 'Strum C four times.'],
      ['Am', 'Lift your ring finger. Place your middle finger on G.'],
      ['C', 'Lift your middle finger and return to C.'],
      ['Am', 'Play Am again. Repeat from the beginning.'],
    ],
  },
  'row-your-boat': {
    name: 'Row, Row, Row Your Boat',
    beats: '1 · 2',
    intro: 'Count two main beats per measure. Start with one downstroke on beat 1, then sing the words over the ringing chord.',
    next: 'Add another downstroke on beat 2. Practice the move from G7 back to C on its own, then try the whole song.',
    measures: [
      ['C', 'Row, row'],
      ['C', 'Row your boat'],
      ['C', 'Gently down'],
      ['C', 'The stream'],
      ['C', 'Merrily, merrily'],
      ['C', 'Merrily, merrily'],
      ['G7', 'Life is but a'],
      ['C', 'Dream'],
    ],
  },
  'mary-had-a-little-lamb': {
    name: 'Mary Had a Little Lamb',
    beats: '1 · 2 · 3 · 4',
    intro: 'Count four beats per measure and strum once on each count. Let the last word ring if you finish singing early.',
    next: 'Practice measures 2 through 4 to get comfortable changing to G7 and back to C.',
    measures: [
      ['C', 'Mary had a'],
      ['C', 'Little lamb'],
      ['G7', 'Little lamb'],
      ['C', 'Little lamb'],
      ['C', 'Mary had a'],
      ['C', 'Little lamb'],
      ['G7', 'Its fleece was white'],
      ['C', 'As snow'],
    ],
  },
};
