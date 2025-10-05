// Comprehensive list of suggestions for web search agent
const allSuggestions = [
  "What are the latest AI trends in 2024?",
  "How does quantum computing work?",
  "Best practices for React development",
  "Explain machine learning algorithms",
  "What is the metaverse and its applications?",
  "How to optimize website performance?",
  "Latest developments in renewable energy",
  "Cybersecurity best practices for businesses",
  "What is blockchain technology?",
  "How to start a successful startup?",
  "Climate change solutions and technologies",
  "Future of electric vehicles",
  "Social media marketing strategies",
  "What is cryptocurrency and how does it work?",
  "Remote work productivity tips",
  "Digital transformation trends",
  "Cloud computing advantages and disadvantages",
  "What is 5G technology and its impact?",
  "E-commerce growth strategies",
  "Mental health awareness in the workplace",
  "Sustainable business practices",
  "Internet of Things (IoT) applications",
  "Data privacy regulations and compliance",
  "Virtual reality in education",
  "Space exploration recent discoveries",
];

/**
 * Get a specified number of random suggestions from the pool
 * @param count Number of suggestions to return (default: 5)
 * @returns Array of random suggestion strings
 */
export const getRandomSuggestions = (count: number = 5): string[] => {
  const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Get all available suggestions
 * @returns Array of all suggestion strings
 */
export const getAllSuggestions = (): string[] => {
  return [...allSuggestions];
};

/**
 * Get suggestions based on a category or filter
 * @param filter Optional filter to apply
 * @returns Array of filtered suggestion strings
 */
export const getFilteredSuggestions = (filter?: string): string[] => {
  if (!filter) return getRandomSuggestions();

  const filtered = allSuggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(filter.toLowerCase())
  );

  return filtered.length > 0 ? filtered : getRandomSuggestions();
};
