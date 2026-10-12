import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDateLong, formatTime } from "@/lib/format";
import type { TicketView } from "@/lib/schemas";

const s = StyleSheet.create({
  page: { backgroundColor: "#0B0B10", color: "#F4F4F6", padding: 28, fontFamily: "Helvetica" },
  brand: { color: "#C6FF3D", fontSize: 20, fontFamily: "Helvetica-Bold" },
  card: { marginTop: 14, borderRadius: 16, backgroundColor: "#16161F", padding: 22, borderWidth: 1, borderColor: "#2C2C3A" },
  label: { color: "#A3A3B5", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 6 },
  row: { flexDirection: "row", marginTop: 12, gap: 20 },
  col: { flex: 1 },
  value: { fontSize: 11, marginTop: 3 },
  qrWrap: { marginTop: 18, alignItems: "center" },
  qr: { width: 150, height: 150, backgroundColor: "#FFFFFF", padding: 8, borderRadius: 10 },
  code: { marginTop: 8, fontSize: 9, color: "#A3A3B5", fontFamily: "Courier" },
  note: { marginTop: 14, fontSize: 8, color: "#A3A3B5", lineHeight: 1.4 },
});

/** E-ticket PDF, satu halaman per tiket. Gambar QR dikirim sebagai data URL PNG. */
export function TicketPdf({ tickets, qrs }: { tickets: TicketView[]; qrs: Record<string, string> }) {
  return (
    <Document title={`E-ticket ${tickets[0]?.event.title ?? ""}`} author="Panggung">
      {tickets.map((t) => (
        <Page key={t.id} size="A5" style={s.page} wrap={false}>
          <Text style={s.brand}>panggung</Text>
          <View style={s.card}>
            <Text style={s.label}>E-ticket</Text>
            <Text style={s.title}>{t.event.title}</Text>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.label}>Tanggal</Text>
                <Text style={s.value}>{formatDateLong(t.event.date)}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.label}>Waktu</Text>
                <Text style={s.value}>{formatTime(t.event.date)}</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.label}>Venue</Text>
                <Text style={s.value}>
                  {t.event.venue}, {t.event.city}
                </Text>
              </View>
              <View style={s.col}>
                <Text style={s.label}>Kategori</Text>
                <Text style={s.value}>
                  {t.categoryName}
                  {t.seatLabel ? ` · Kursi ${t.seatLabel}` : ""}
                </Text>
              </View>
            </View>
            {t.order.buyer && (
              <View style={s.row}>
                <View style={s.col}>
                  <Text style={s.label}>Atas nama</Text>
                  <Text style={s.value}>{t.order.buyer.name}</Text>
                </View>
              </View>
            )}
            <View style={s.qrWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak mendukung alt */}
              {qrs[t.id] && <Image src={qrs[t.id]!} style={s.qr} />}
              <Text style={s.code}>{t.id}</Text>
            </View>
          </View>
          <Text style={s.note}>
            Tunjukkan QR ini di pintu masuk. Satu QR untuk satu orang dan hanya bisa dipindai sekali. Panggung adalah proyek
            portofolio: konser dan tiket ini fiktif.
          </Text>
        </Page>
      ))}
    </Document>
  );
}
