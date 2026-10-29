import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const fromApi = err.response?.data?.error?.message;
    const offline = !err.response;
    err.uiMessage = fromApi || (offline ? 'No signal. The work still counts.' : 'It did not save. Try again.');
    err.status = err.response?.status;
    return Promise.reject(err);
  },
);

export default client;
