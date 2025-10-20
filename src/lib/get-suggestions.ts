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

const deepSearchSuggestions = [
  "Conduct a comprehensive analysis of the differences between the deep web and dark web",
  "Investigate current geopolitical tensions in Eastern Europe and their global economic impacts",
  "Research the latest breakthroughs in CRISPR gene editing and their ethical implications",
  "Analyze how climate change has affected global migration patterns over the past decade",
  "Explore the evolution of quantum computing hardware and emerging commercial applications",
  "Deep dive into the origins of the opioid crisis and effectiveness of current interventions",
  "Examine emerging trends in sustainable agriculture technologies and their adoption rates",
  "Comprehensive study on the impact of social media on adolescent mental health",
  "Investigate blockchain applications beyond cryptocurrency and associated challenges",
  "Research the future of space tourism: key companies, technologies, and regulatory hurdles",
  "Analyze the current state and trajectory of artificial general intelligence research",
  "Explore advanced techniques for conducting effective deep web searches",
  "Investigate tools and best practices for maintaining online anonymity",
  "Research legal considerations and risks when exploring the deep web",
  "Deep analysis of Tor network usage and its role in online privacy",
  "Examine the security landscape of deep web browsing and protection strategies",
  "Research the role of academic databases in the deep web ecosystem",
  "Investigate hidden services on the dark web and their societal implications",
  "Analyze techniques for advanced search queries across different web layers",
  "Explore niche communities and forums on the deep web and their cultural impact",
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

export const getDeepSearchSuggestions = (): string[] => {
  return [...deepSearchSuggestions];
};
export const getRandomDeepSearchSuggestions = (count: number = 5): string[] => {
  const shuffled = [...deepSearchSuggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getFilteredDeepSearchSuggestions = (filter?: string): string[] => {
  if (!filter) return getRandomDeepSearchSuggestions();

  const filtered = deepSearchSuggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(filter.toLowerCase())
  );

  return filtered.length > 0 ? filtered : getRandomDeepSearchSuggestions();
};
