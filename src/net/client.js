// Client HTTP cho server phòng chơi (server/server.js). Dùng fetch có sẵn của React Native, không thêm dependency.
async function request(base, method, path, query, body) {
  const root = base.replace(/\/+$/, '');
  let res;
  if (method === 'GET') {
    const qs = Object.keys(query || {}).map((k) => `${k}=${encodeURIComponent(query[k])}`).join('&');
    res = await fetch(`${root}${path}?${qs}`);
  } else {
    res = await fetch(root + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

export const createRoom = (base, name) => request(base, 'POST', '/create', null, { name });
export const joinRoom = (base, room, name) => request(base, 'POST', '/join', null, { room, name });
export const sendAction = (base, room, token, action) => request(base, 'POST', '/action', null, { room, token, ...action });
export const fetchState = (base, room, token, since) => request(base, 'GET', '/state', { room, token, since }, null);
