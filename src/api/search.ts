import request from "@/utils/request";
import { ISearchDetail } from "@/type/search";

// 搜索内容
export const getSearch = (keywords: any) => {
  return request.get<ISearchDetail>("/search", {
    params: { keywords: keywords, type: 1018 },
  });
};
