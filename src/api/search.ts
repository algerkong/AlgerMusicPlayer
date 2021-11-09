import request from "@/utils/request"
import { ISearchDetail } from "@/type/search"

// 搜索内容
export const getSearch = (keywords: any) => {
  return request.get<any>("/cloudsearch", {
    params: { keywords: keywords, type: 1 },
  })
}
