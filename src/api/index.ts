import axios from "axios";

// const baseURL = `${window.location.protocol}//${window.location.host}/api/v1`;

export const api = axios.create({
    baseURL: "http://localhost:3000/api/v1",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
