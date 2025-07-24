export const generateRandomName = () => {
  const adjectives = [
    "Mysterious",
    "Ancient",
    "Hidden",
    "Sacred",
    "Wild",
    "Untamed",
    "Remote",
    "Pristine",
    "Vibrant",
    "Serene",
  ];
  const nouns = [
    "Forest",
    "Valley",
    "Mountain",
    "River",
    "Lake",
    "Meadow",
    "Grove",
    "Peak",
    "Basin",
    "Ridge",
  ];
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
};
