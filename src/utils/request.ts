import axios from "axios";

const request = axios.create({
  baseURL: "http://123.56.226.179:3000",
  timeout: 10000,
});

export default request;
