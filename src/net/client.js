// Client HTTP cho server phòng chơi (server/server.js). Dùng fetch có sẵn của React Native, không thêm dependency.
const TIMEOUT_MS = 8000;        // poll/hành động: quá 8 giây coi như hỏng, để vòng poll chạy tiếp
const SLOW_TIMEOUT_MS = 60000;  // tạo/vào phòng: Render gói free "ngủ" nên lần gọi đầu có thể mất ~30-60 giây

/* MỤC ĐÍCH: gửi 1 request tới server và trả JSON, báo lỗi tiếng Việt rõ ràng.
 * CÁCH HOẠT ĐỘNG: fetch của React Native KHÔNG có timeout mặc định, request treo (mạng đổi, app xuống nền, kết nối cũ chết)
 * sẽ treo mãi. Nên dùng AbortController: quá timeoutMs thì hủy request và ném lỗi, nhờ đó vòng poll ở Online.js không bị kẹt. */
async function request(base, method, path, query, body, timeoutMs) {
  const root = base.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || TIMEOUT_MS);
  try {
    let res;
    if (method === 'GET') {
      const qs = Object.keys(query || {}).map((k) => `${k}=${encodeURIComponent(query[k])}`).join('&');
      res = await fetch(`${root}${path}?${qs}`, { signal: controller.signal });
    } else {
      res = await fetch(root + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: controller.signal });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
    return data;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Server không phản hồi, đang thử lại…');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const createRoom = (base, name) => request(base, 'POST', '/create', null, { name }, SLOW_TIMEOUT_MS);
export const joinRoom = (base, room, name) => request(base, 'POST', '/join', null, { room, name }, SLOW_TIMEOUT_MS);
export const sendAction = (base, room, token, action) => request(base, 'POST', '/action', null, { room, token, ...action });
export const fetchState = (base, room, token, since) => request(base, 'GET', '/state', { room, token, since }, null);
