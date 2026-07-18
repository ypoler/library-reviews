export type Review = {
  id: string;
  book: string;
  author: string;
  rank: string;
  review: string;
  reader: string;
  date: Date | null;
  rawDate: string;
};

export type BookGroup = {
  key: string;
  book: string;
  author: string;
  reviews: Review[];
  count: number;
  avgScore: number;
  latest: number; // ms timestamp of the most recent review (0 if unknown)
};
