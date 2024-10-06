import axios from "axios";

export const api = axios.create({
    baseURL: `http://${process.env.NEXT_PUBLIC_SITE_DOMAIN || "localhost:3000"}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
