// Central API configuration for production (Vercel) and local development
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export default API_URL;
