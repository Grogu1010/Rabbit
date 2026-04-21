const who = ["a dentist", "your grandma", "a washed-up influencer", "an alien", "a substitute teacher", "a pirate", "your future self", "a billionaire toddler", "a wizard intern", "a mall cop"];
const where = ["in a haunted IKEA", "at a sad birthday party", "during jury duty", "on a spaceship", "at a gas station wedding", "inside a group chat", "at a zombie yoga class", "at a fancy funeral", "at a middle school reunion", "on live TV"];
const action = ["explain taxes", "confess a secret", "sell a bad product", "start a cult", "apologize", "flirt", "win an argument", "order food", "ask for help", "pitch a movie"];

export function buildPromptDeck(size = 150) {
  const prompts = [];
  let idx = 0;
  while (prompts.length < size) {
    prompts.push(`The phone rings. Pretend you're ${who[idx % who.length]} ${where[idx % where.length]} trying to ${action[idx % action.length]}.`);
    prompts.push(`The phone rings. What's the worst first line ${who[(idx + 3) % who.length]} could say ${where[(idx + 1) % where.length]}?`);
    prompts.push(`The phone rings. Give your best one-liner as if you are ${who[(idx + 5) % who.length]}.`);
    idx += 1;
  }
  return prompts.slice(0, size);
}

const genericSnark = [
  "I haven't seen confidence like that since a cat knocked over a vase and blamed physics.",
  "That answer had layers. Mostly chaos, but layers.",
  "I asked for genius and got glitter glue. I'm not mad.",
  "Honestly? I've heard worse from elected officials.",
  "That was bold, reckless, and weirdly beautiful.",
  "I need a minute to recover, and maybe a legal team.",
  "If confusion was currency, we'd all be rich.",
  "My circuits just filed a workplace complaint.",
  "One of you came to win. The other came to vibe.",
  "That answer kicked the door down and yelled 'plot twist'."
];

const threePlayer = [
  "Three players? Cozy. Like a tiny courtroom for bad ideas.",
  "Only three of you means every vote is spicy.",
  "A trio! Statistically, someone is about to feel personally attacked.",
  "Three players: less traffic, more drama.",
  "Welcome to the smallest possible riot."
];

const streakLines = [
  "{name} just won three in a row. That's not a streak; that's a threat.",
  "Three straight wins for {name}. Somebody check if they're cheating with charisma.",
  "{name} is on a heater. The rest of you may now panic responsibly."
];

const comebackLines = [
  "{name} just pulled a comeback so dramatic it needs theme music.",
  "From behind to first: {name} said 'watch this' and then did that.",
  "{name} completed the comeback arc. Critics are calling it unrealistic."
];

const perfectLines = [
  "{name} won every single question. That's rude, honestly.",
  "Perfect game for {name}. The rest of you were... present.",
  "{name} just speedran domination. No notes, just fear."
];

export function buildHostVoiceLibrary() {
  const anyTime = [...genericSnark];
  for (let i = 0; i < 110; i += 1) {
    anyTime.push(`Commentary module ${i + 1}: this lobby smells like ambition and mild regret.`);
  }
  return {
    anyTime,
    playerCount: {
      3: threePlayer
    },
    streak: streakLines,
    comeback: comebackLines,
    perfect: perfectLines
  };
}


const callingAnswers = [
  "Toy Story",
  "No",
  "Yes, but only on Tuesdays",
  "My lawyer said I can't answer that",
  "Chicken nuggets",
  "Absolutely not, captain",
  "A haunted Roomba",
  "That wasn't in the budget",
  "Hmm, idk bro, do you want some seaweed?",
  "404: confidence not found",
  "The moon did it",
  "Because grandma said so",
  "A kazoo solo",
  "I plead the fifth... and maybe the sixth",
  "Just vibes"
];

export function buildCallingMachineDeck(size = 120) {
  const prompts = [];
  let idx = 0;
  while (prompts.length < size) {
    prompts.push(callingAnswers[idx % callingAnswers.length]);
    idx += 1;
  }
  return prompts.slice(0, size);
}
