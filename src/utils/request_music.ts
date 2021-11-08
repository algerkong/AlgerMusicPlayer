import axios from "axios"
let baseURL = import.meta.env.VITE_API_MUSIC + ""
const request = axios.create({
  baseURL: baseURL,
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error)
  }
)

export default request
