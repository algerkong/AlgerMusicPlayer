import axios from "axios";

const request = axios.create({
  baseURL: "http://123.56.226.179:3000",
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 在请求发送之前做一些处理
    // 在get请求params中添加timestamp
    if (config.method === "get") {
      config.params = {
        ...config.params,
        timestamp: Date.now(),
      };
      let token = localStorage.getItem("token");
      if (token) {
        config.params.cookie = token;
      }
    }

    return config;
  },
  (error) => {
    // 当请求异常时做一些处理
    return Promise.reject(error);
  }
);

export default request;
