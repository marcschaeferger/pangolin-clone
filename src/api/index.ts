import axios from "axios";

export const api = axios.create({
    baseURL: "https://fossorial.io/api/v1",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const internal = axios.create({
    baseURL: "http://pangolin:3000/api/v1",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
