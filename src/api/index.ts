import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const internal = axios.create({
    baseURL: process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
