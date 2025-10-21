export type uniferoWebSearchResult = {
  url: string;
  title: string | null;
  snippet: string | null;
  content: string | null;
  favicon: string | null;
  og_image: string | null;
};

export type uniferoWebSearchResponse = {
  query: string;
  results: uniferoWebSearchResult[];
};
