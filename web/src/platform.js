// Nhận biết iPhone/iPad (Safari iOS). Trên iOS, Safari bỏ qua đặt âm lượng bằng code (audio.volume chỉ đọc),
// nên app ẩn thanh âm lượng và tắt crossfade/fade, để người dùng dùng nút âm lượng vật lý.
export const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
