// Chạy: node tools/make-assets.js
// Sinh assets/icon.png, adaptive-icon.png, splash-icon.png và assets/sounds/*.wav.
// Thuần Node (zlib có sẵn), không cần thư viện ngoài. Muốn đổi hình/âm thanh: sửa file này rồi chạy lại.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(path.join(OUT, 'sounds'), { recursive: true });

// ---------- PNG (tự mã hóa: chữ ký + IHDR + IDAT(zlib) + IEND, mỗi chunk có CRC32) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bit, RGBA
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h); // mỗi dòng: 1 byte filter (0) + pixel
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Vẽ logo: ổ đạn 10 ngăn (3 ngăn đã nạp đạn đỏ) ----------
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Các lớp là hình tròn, thứ tự từ TRÊN xuống DƯỚI: lớp đầu tiên chứa điểm ảnh thì thắng.
function logoLayers(S, scale) {
  const C = S / 2, k = (S / 1024) * scale, L = [];
  const add = (cx, cy, r, col) => L.push({ x: C + cx * k, y: C + cy * k, r: r * k, c: hex(col) });
  add(0, 0, 38, '#e0b84c');                   // trục giữa
  add(0, 0, 86, '#0b2a20');                   // vành tối quanh trục
  for (let i = 0; i < 10; i++) {              // 10 ngăn đạn
    const a = ((-90 + 36 * i) * Math.PI) / 180, x = Math.cos(a) * 262, y = Math.sin(a) * 262;
    if (i < 3) add(x, y, 40, '#d9534f');      // viên đạn
    add(x, y, 58, '#0b2a20');                 // lỗ ngăn
  }
  add(0, 0, 340, '#ecc965');                  // mặt trong sáng hơn
  add(0, 0, 384, '#d9ae3f');                  // mặt ổ
  add(0, 0, 402, '#a8822a');                  // viền
  return L;
}

function render(S, layers, withBg) {
  const buf = Buffer.alloc(S * S * 4), N = 2, dark = hex('#0b2e23'), light = hex('#1d6a50');
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const px = x + (sx + 0.5) / N, py = y + (sy + 0.5) / N;
        let col = null;
        for (const L of layers) {
          const dx = px - L.x, dy = py - L.y;
          if (dx * dx + dy * dy <= L.r * L.r) { col = L.c; break; }
        }
        if (!col && withBg) col = lerp(light, dark, Math.min(1, Math.hypot(px - S / 2, py - S / 2) / (S * 0.7)));
        if (col) { r += col[0]; g += col[1]; b += col[2]; a++; }
      }
      const i = (y * S + x) * 4;
      if (a) { buf[i] = Math.round(r / a); buf[i + 1] = Math.round(g / a); buf[i + 2] = Math.round(b / a); buf[i + 3] = Math.round((255 * a) / (N * N)); }
    }
  }
  return buf;
}

const S = 1024;
fs.writeFileSync(path.join(OUT, 'icon.png'), encodePng(S, S, render(S, logoLayers(S, 0.92), true)));
// Adaptive icon Android: chỉ lớp nền trước, nội dung nằm trong vùng an toàn ~66% giữa ảnh.
fs.writeFileSync(path.join(OUT, 'adaptive-icon.png'), encodePng(S, S, render(S, logoLayers(S, 0.78), false)));
fs.writeFileSync(path.join(OUT, 'splash-icon.png'), encodePng(S, S, render(S, logoLayers(S, 0.95), false)));

// ---------- Âm thanh WAV 16-bit mono 22050 Hz (tổng hợp bằng toán, không cần file mp3) ----------
const SR = 22050;
let seed = 12345; // nhiễu giả ngẫu nhiên cố định để mỗi lần chạy ra cùng một file
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mk = (sec, fn) => { const n = Math.floor(sec * SR), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = fn(i / SR); return a; };

function writeWav(name, samples) {
  let peak = 0.0001;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round((samples[i] / peak) * 0.85 * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(OUT, 'sounds', name + '.wav'), buf);
}

// Đồng xu: tiếng "tinh" kim loại rồi nảy vài lần.
writeWav('coin', mk(1.1, (t) => {
  const ting = (t0, f, amp, decay) => {
    if (t < t0) return 0;
    const u = t - t0;
    return amp * Math.min(1, u * 3000) * Math.exp(-u * decay) * (Math.sin(2 * Math.PI * f * u) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * u));
  };
  return ting(0, 2400, 0.8, 6) + ting(0.25, 2700, 0.35, 9) + ting(0.5, 2500, 0.3, 9) + ting(0.7, 2300, 0.45, 7);
}));

// Súng nổ: nhiễu đã lọc (tiếng nổ) + sóng trầm hạ tần (tiếng dội), bão hòa nhẹ cho "dày".
let lp = 0;
writeWav('bang', mk(0.9, (t) => {
  const nz = rnd() * 2 - 1;
  lp += (nz - lp) * 0.35;
  const boom = Math.sin(2 * Math.PI * (70 + 40 * Math.exp(-t * 12)) * t) * Math.exp(-t * 9) * 0.9;
  return Math.tanh(1.5 * (lp * 1.4 * Math.exp(-t * 14) + boom + nz * Math.exp(-t * 80) * 0.8));
}));

// Cạch: 2 tiếng click ngắn (cò súng, ổ đạn trống).
writeWav('click', mk(0.3, (t) => {
  const c = (t0, amp) => (t >= t0 ? amp * Math.exp(-(t - t0) * 400) * Math.sin(2 * Math.PI * 1800 * (t - t0)) * (1 + (rnd() * 2 - 1) * 0.3) : 0);
  return c(0, 0.9) + c(0.11, 0.6);
}));

// Lá bài: tiếng "xoạt" ngắn (nhiễu cao tần có đường bao).
let prev = 0;
writeWav('card', mk(0.14, (t) => {
  const nz = rnd() * 2 - 1, out = nz - prev * 0.9; prev = nz;
  return out * Math.sin((Math.PI * t) / 0.14) ** 2 * Math.exp(-t * 12) * 0.6;
}));

console.log('Đã tạo assets/icon.png, adaptive-icon.png, splash-icon.png và assets/sounds/{coin,bang,click,card}.wav');
