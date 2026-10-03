export type PromptPack = {
  id: string;
  label: string;
  blurb: string;
  emoji: string;
  prompts: string[];
};

export const PROMPT_PACKS: PromptPack[] = [
  {
    id: "mixed",
    label: "House Mix",
    blurb: "A bit of everything. The default riot.",
    emoji: "🎲",
    prompts: [
      "A cat filing its taxes",
      "The last slice of pizza",
      "Your wifi router having a bad day",
      "A T-Rex making the bed",
      "Monday morning",
      "A haunted toaster",
      "The world's smallest violin",
      "A raccoon at a fancy dinner",
      "Your phone at 1% battery",
      "A ghost trying to be scary",
      "A penguin at the beach",
      "The inside of your junk drawer",
      "A dragon with a day job",
      "Your favourite snack, but angry",
      "A robot learning to hug",
      "A snail in a hurry",
      "The loudest person you know",
      "A potato running for mayor",
      "Your bed on a Monday",
      "An octopus juggling",
    ],
  },
  {
    id: "chaos",
    label: "Pure Chaos",
    blurb: "Absurd prompts, zero dignity.",
    emoji: "🔥",
    prompts: [
      "A shark at a business meeting",
      "Grandma doing a kickflip",
      "A banana robbing a bank",
      "Two pigeons gossiping",
      "A wizard with a printer that jams",
      "A cowboy riding a vacuum cleaner",
      "An angry garden gnome",
      "A whale in a swimming pool",
      "A mime with too much to say",
      "A yeti on a tropical holiday",
      "A dinosaur parallel parking",
      "A clown at a job interview",
      "A crab with a tiny briefcase",
      "Your fridge judging you at 3am",
      "A knight fighting a goose",
    ],
  },
  {
    id: "cozy",
    label: "Cosy Corner",
    blurb: "Gentle things, drawn badly.",
    emoji: "🌿",
    prompts: [
      "A frog on a lily pad",
      "Hot chocolate with too many marshmallows",
      "A cat asleep in a cardboard box",
      "A tiny house in the woods",
      "Rain on a window",
      "A snail garden",
      "Fresh bread and butter",
      "A hedgehog in a jumper",
      "The comfiest chair in the world",
      "A lighthouse at sunset",
      "Mushrooms after rain",
      "A dog in a sunbeam",
    ],
  },
  {
    id: "pop",
    label: "Screen Time",
    blurb: "Films, games and internet nonsense.",
    emoji: "📼",
    prompts: [
      "A superhero whose power is queuing",
      "The final boss of a terrible game",
      "A spaceship with a parking ticket",
      "A streaming service buffering forever",
      "A video game character with no textures",
      "The villain's unnecessarily big lair",
      "A robot butler on strike",
      "An alien reviewing Earth online",
      "A movie poster for your morning commute",
      "A treasure chest full of cables",
      "The hero arriving one second too late",
      "A dragon guarding a vending machine",
    ],
  },
];

export const PACK_BY_ID: Record<string, PromptPack> = Object.fromEntries(
  PROMPT_PACKS.map((p) => [p.id, p]),
);

export function packIds(): string[] {
  return PROMPT_PACKS.map((p) => p.id);
}
