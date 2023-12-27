import request from "@/utils/request"
import { ISearchDetail } from "@/type/search"

interface IParams {
  keywords: string
  type: number
}
// 搜索内容
export const getSearch = (params: IParams) => {
  return request.get<any>('/cloudsearch', {
    params,
  })
}
