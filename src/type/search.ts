export interface ISearchKeyword {
  code: number;
  message?: any;
  data: SearchKeywordData;
}

interface SearchKeywordData {
  showKeyword: string;
  realkeyword: string;
  searchType: number;
  action: number;
  alg: string;
  gap: number;
  source?: any;
  bizQueryInfo: string;
}
