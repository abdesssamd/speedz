import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Clipboard, SafeAreaView, Share, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

const INVITE_CODE = "FOOD-2026";

const HOW_IT_WORKS = [
  { icon: "share-social-outline" as const, title: "Partagez votre code", desc: "Envoyez votre code à vos amis par SMS, WhatsApp ou email." },
  { icon: "bag-check-outline" as const, title: "Ils commandent", desc: "Votre ami passe sa première commande avec votre code." },
  { icon: "gift-outline" as const, title: "Gagnez ensemble", desc: "Vous recevez tous les deux des points bonus et des réductions." },
];

export function InviteScreen() {
  const { t, isRTL, pushNotification } = useApp();

  const copyCode = async () => {
    await Clipboard.setString(INVITE_CODE);
    pushNotification({ title: t("code_copied"), message: t("code_copied_msg"), tone: "success" });
  };

  const shareCode = async () => {
    await Share.share({ message: `${t("invite_code")}: ${INVITE_CODE}` });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Title */}
        <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("invite_title")}</Text>
        <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("invite_subtitle")}</Text>

        {/* Code card */}
        <View style={s.codeCard}>
          <View style={s.codeTop}>
            <View style={s.giftWrap}><Ionicons name="gift" size={28} color="#FF7622" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.codeLabel}>{t("invite_code")}</Text>
              <Text style={s.code}>{INVITE_CODE}</Text>
            </View>
          </View>
          <View style={s.codeDivider} />
          <View style={s.codeActions}>
            <ScalePressable containerStyle={s.copyBtn} onPress={copyCode}>
              <Ionicons name="copy-outline" size={16} color="#FF7622" />
              <Text style={s.copyBtnText}>{t("copy_code")}</Text>
            </ScalePressable>
            <ScalePressable containerStyle={s.shareBtn} onPress={shareCode}>
              <Ionicons name="share-social-outline" size={16} color="#FFF" />
              <Text style={s.shareBtnText}>{t("share_code")}</Text>
            </ScalePressable>
          </View>
        </View>

        {/* How it works */}
        <Text style={s.sectionTitle}>Comment ça marche ?</Text>
        <View style={s.stepList}>
          {HOW_IT_WORKS.map((step, i) => (
            <AnimatedCard key={step.title} delay={i * 80} style={s.stepCard}>
              <View style={s.stepLeft}>
                <View style={s.stepIconWrap}><Ionicons name={step.icon} size={20} color="#FF7622" /></View>
                <View style={i < HOW_IT_WORKS.length - 1 ? s.stepLine : s.stepLineHidden} />
              </View>
              <View style={s.stepBody}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </AnimatedCard>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, padding: 20, gap: 18 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 14, lineHeight: 20, marginTop: -8 },

  codeCard: { backgroundColor: "#FFF", borderRadius: 28, padding: 22, gap: 18, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  codeTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  giftWrap: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  codeLabel: { color: "#898989", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  code: { color: "#181C2E", fontSize: 32, fontWeight: "900", letterSpacing: 3, marginTop: 2 },
  codeDivider: { height: 1, backgroundColor: "#F5F5F5" },
  codeActions: { flexDirection: "row", gap: 12 },
  copyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, backgroundColor: "#FFF3EC", borderWidth: 1.5, borderColor: "#FFD5B8" },
  copyBtnText: { color: "#FF7622", fontWeight: "900", fontSize: 14 },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, backgroundColor: "#FF7622", shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  shareBtnText: { color: "#FFF", fontWeight: "900", fontSize: 14 },

  sectionTitle: { color: "#181C2E", fontSize: 20, fontWeight: "900" },
  stepList: { gap: 0 },
  stepCard: { flexDirection: "row", gap: 16, paddingVertical: 6 },
  stepLeft: { alignItems: "center", gap: 0 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFD5B8" },
  stepLine: { width: 2, flex: 1, backgroundColor: "#FFD5B8", marginVertical: 4, minHeight: 20 },
  stepLineHidden: { width: 2, flex: 1, backgroundColor: "transparent" },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepTitle: { color: "#181C2E", fontWeight: "800", fontSize: 15, marginBottom: 4 },
  stepDesc: { color: "#898989", fontSize: 13, lineHeight: 20 },
});
