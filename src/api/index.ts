import axios from "axios";

let origin;
if (typeof window !== "undefined") {
    origin = window.location.origin;
}

export const api = axios.create({
    baseURL: `${origin}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// we can pull from env var here becuase it is only used in the server
export const internal = axios.create({
    baseURL: `http://localhost:${process.env.SERVER_EXTERNAL_PORT}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export const priv = axios.create({
    baseURL: `http://localhost:${process.env.SERVER_INTERNAL_PORT}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
