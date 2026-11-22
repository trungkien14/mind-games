import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { listOutsForHand } from '../core/cards';

/* MỤC ĐÍCH: bảng "Gợi ý" cho người mới chưa biết luật poker.
 * CÁCH HOẠT ĐỘNG: nhận 4 lá trên tay (+ lá đang lộ ở bàn) rồi gọi listOutsForHand để biết thêm 1 lá nào thì được
 * tổ hợp gì. Mỗi dòng = 1 tổ hợp: tên, điểm (= số đạn đối thủ phải nạp), giải thích luật, và lá cần có.
 * useMemo để chỉ tính lại khi bài trên tay đổi (mỗi lần tính duyệt ~50 lá, nhẹ nhưng không cần lặp mỗi lần render).
 * Khi tay không đúng 4 lá (đang ở pha bỏ bài, có 5 lá) thì chỉ nhắc người chơi bỏ bớt 1 lá trước. */
export function HintPanel({ hand, seenCards }) {
  const outs = useMemo(
    () => (hand.length === 4 ? listOutsForHand(hand, seenCards) : null),
    [hand.map((c) => c.id).join(','), seenCards.map((c) => c.id).join(',')]
  );

  if (!outs) {
    return (
      <View style={s.panel}>
        <Text style={s.note}>Bạn đang cầm 5 lá. Hãy bỏ 1 lá, rồi bấm Gợi ý để xem 4 lá còn lại có thể thành tổ hợp nào.</Text>
      </View>
    );
  }

  return (
    <View style={s.panel}>
      <Text style={s.title}>Thêm 1 lá nữa bạn có thể được:</Text>
      {outs.length === 0 ? (
        <Text style={s.note}>Chưa có lá nào tạo được tổ hợp. Cứ bốc bài và giữ những lá gần nhau về số hoặc cùng chất.</Text>
      ) : (
        outs.map((o) => (
          <View key={o.score} style={s.row}>
            <Text style={s.name}>{o.name} · {o.score} điểm <Text style={s.count}>({o.count} lá)</Text></Text>
            <Text style={s.help}>{o.help}</Text>
            {o.needs ? <Text style={s.needs}>Cần: {o.needs}</Text> : null}
          </View>
        ))
      )}
      <Text style={s.note}>Lá đó có thể bốc từ bộ bài hoặc là lá đối thủ vừa bỏ (Call). Điểm cao hơn = đối thủ nạp nhiều đạn hơn.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: '#00000059', borderRadius: 12, borderWidth: 1, borderColor: '#e0b84c60', padding: 10, gap: 8, alignSelf: 'stretch' },
  title: { color: '#e0b84c', fontWeight: '700' },
  row: { gap: 2 },
  name: { color: '#e9efe9', fontWeight: '700' },
  count: { color: '#9db5a8', fontWeight: '400' },
  help: { color: '#9db5a8', fontSize: 12 },
  needs: { color: '#e0b84c', fontSize: 12 },
  note: { color: '#9db5a8', fontSize: 12 },
});
