import client from './client.js';

export const authApi = {
  status: () => client.get('/auth/status').then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
  login: (body) => client.post('/auth/login', body).then((r) => r.data),
  register: (body) => client.post('/auth/register', body).then((r) => r.data),
  logout: () => client.post('/auth/logout').then((r) => r.data),
};

export const habitsApi = {
  list: () => client.get('/habits').then((r) => r.data),
  create: (body) => client.post('/habits', body).then((r) => r.data),
  update: (id, body) => client.patch(`/habits/${id}`, body).then((r) => r.data),
  remove: (id) => client.delete(`/habits/${id}`).then((r) => r.data),
};

export const daysApi = {
  get: (date) => client.get(`/days/${date}`).then((r) => r.data),
  evening: (date, body) => client.put(`/days/${date}/evening`, body).then((r) => r.data),
  morning: (date, body) => client.put(`/days/${date}/morning`, body).then((r) => r.data),
  close: (date) => client.post(`/days/${date}/close`).then((r) => r.data),
  remove: (date) => client.delete(`/days/${date}`).then((r) => r.data),
};

export const statsApi = {
  summary: () => client.get('/stats/summary').then((r) => r.data),
};

export const verdictApi = {
  latest: () => client.get('/verdict/latest').then((r) => r.data),
};
