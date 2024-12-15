export interface IPlayListSort {
  code: number;
  all: SortAll;
  sub: SortAll[];
  categories: SortCategories;
}

interface SortCategories {
  '0': string;
  '1': string;
  '2': string;
  '3': string;
  '4': string;
}

interface SortAll {
  name: string;
  resourceCount?: number;
  imgId?: number;
  imgUrl?: any;
  type?: number;
  category?: number;
  resourceType?: number;
  hot?: boolean;
  activity?: boolean;
}
