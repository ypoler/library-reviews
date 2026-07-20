// All user-facing Hebrew text in one place for easy editing.

export const t = {
  appTitle: "ביקורות ספרים",
  tagline: "מה הקוראים שלנו חושבים על הספרים בספרייה",

  // Home
  writeReview: "כתיבת ביקורת",
  writeReviewSub: "מילוי טופס ביקורת על ספר שקראתם",
  browseReviews: "עיון בביקורות",
  browseReviewsSub: "חיפוש ועיון בביקורות של הקוראים",
  formUnavailable: "קישור הטופס יתווסף בקרוב",

  // Reviews page
  backHome: "חזרה לדף הבית",

  // Write (form) page
  openFormFullPage: "פתיחת הטופס בחלון חדש",
  formLoading: "טוען את הטופס...",
  searchPlaceholder: "חיפוש...",
  searchScopeAll: "הכל",
  searchScopeBook: "שם הספר",
  searchScopeAuthor: "שם הסופר/ת",
  searchScopeReader: "שם הקורא/ת",

  sortLabel: "מיון",
  sortNewest: "החדשות ביותר",
  sortBookAsc: "שם הספר (א-ת)",
  sortAuthorAsc: "שם הסופר/ת (א-ת)",
  sortRankDesc: "דירוג גבוה לנמוך",
  sortRankAsc: "דירוג נמוך לגבוה",
  sortMostReviewed: "הכי הרבה ביקורות",

  clearFilters: "ניקוי חיפוש",
  loadMore: "עוד ביקורות",

  resultsCount: (books: number, reviews: number) =>
    `${books} ספרים · ${reviews} ביקורות`,
  reviewsCount: (n: number) => (n === 1 ? "ביקורת אחת" : `${n} ביקורות`),
  averageRank: "דירוג ממוצע",
  by: "מאת",

  showMore: "עוד",
  showLess: "פחות",

  loading: "טוען ביקורות...",
  emptyState: "לא נמצאו ביקורות התואמות את החיפוש.",
  errorTitle: "אירעה שגיאה בטעינת הביקורות",
  retry: "נסו שוב",
} as const;
