export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "cozy-matcha",
    name: "Cozy Matcha & Tea",
    colors: ["#D8E2DC", "#FFE5D9", "#FFCAD4", "#F4ACB7", "#9D8189", "#A3B18A", "#588157", "#3A5A40", "#344E41"],
  },
  {
    id: "pastel-sorbet",
    name: "Pastel Sorbet",
    colors: ["#FFB5A7", "#FCD5CE", "#F8EDEB", "#F9DCC4", "#FEC89A", "#B5EAD7", "#C7CEEA", "#E2F0CB", "#FFDAC1"],
  },
  {
    id: "warm-earth-capybara",
    name: "Earthy Capybara",
    colors: ["#6F4E37", "#A67B5B", "#ECB176", "#FED8B1", "#E6BAA3", "#795548", "#8D6E63", "#D7CCC8", "#F5F5DC"],
  },
  {
    id: "sunset-neon",
    name: "Sunset & Cyber Lofi",
    colors: ["#2B2D42", "#8D99AE", "#EDF2F4", "#EF233C", "#D90429", "#FF70A6", "#FF9770", "#FFD670", "#E9FF70"],
  },
  {
    id: "celestial-dreams",
    name: "Celestial Dreams",
    colors: ["#03045E", "#023E8A", "#0077B6", "#0096C7", "#00B4D8", "#48CAE4", "#90E0EF", "#ADE8F4", "#CAF0F8"],
  },
  {
    id: "classic-crayons",
    name: "Art Studio Basics",
    colors: ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899", "#111827"],
  },
];
