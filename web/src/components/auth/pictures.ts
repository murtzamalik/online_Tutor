/** Picture-PIN alphabet shared by the parent "Add a child" screen and the child login grid. Keys are stored, so never rename one. */
export const PICTURES: { key: string; emoji: string; label: string }[] = [
  { key: "cat", emoji: "🐱", label: "Cat" },
  { key: "dog", emoji: "🐶", label: "Dog" },
  { key: "tree", emoji: "🌳", label: "Tree" },
  { key: "star", emoji: "⭐", label: "Star" },
  { key: "book", emoji: "📘", label: "Book" },
  { key: "ball", emoji: "⚽", label: "Ball" },
  { key: "sun", emoji: "☀️", label: "Sun" },
  { key: "moon", emoji: "🌙", label: "Moon" },
  { key: "fish", emoji: "🐟", label: "Fish" },
  { key: "bird", emoji: "🐦", label: "Bird" },
  { key: "car", emoji: "🚗", label: "Car" },
  { key: "bike", emoji: "🚲", label: "Bike" },
];

export const pictureOf = (key: string) => PICTURES.find((p) => p.key === key);
