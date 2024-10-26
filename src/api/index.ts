import axios from "axios";

// let origin;
// if (typeof window !== "undefined") {
//     origin = window.location.origin;
// }

export const api = axios.create({
    baseURL: `http://localhost:3000/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const internal = axios.create({
    baseURL: `http://localhost:3000/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
