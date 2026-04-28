import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatDateTime } from "../services/format";
import { api } from "../services/api";
import { CourierDashboard } from "../types";
import { Ionicons } from "@expo/vector-icons";

export function CourierHubScreen() {
  const { currentLocation, language, t, isRTL, pushNotification } = useApp();
  const [courierId, setCourierId] = useState("");
  const [dashboard, setDashboard] = useState<CourierDashboard|null>(null);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    if (!courierId.trim()) { pushNotification({title:t("application_error"),message:t("courier_id"),tone:"error"}); return; }
    setLoading(true);
    try {
      const payload = await api.getCourierJobs({courierId:courierId.trim(),lat:currentLocation.coordinates.latitude,lng:currentLocation.coordinates.longitude});
      setDashboard(payload);
    } catch(error) {
      pushNotification({title:t("application_error"),message:error instanceof Error?error.message:t("application_error_msg"),tone:"error"});
    } finally { setLoading(false); }
  };

  const acceptJob = async (orderId: string) => {
    try {
      await api.acceptCourierJob(orderId,courierId.trim());
      pushNotification({title:t("courier_accept"),message:"La course a été affectée.",tone:"success"});
      await loadJobs();
    } catch(error) {
      pushNotification({title:t("application_error"),message:error instanceof Error?error.message:t("application_error_msg"),tone:"error"});
    }
  };

  useEffect(()=>{
    if (!courierId.trim()) return;
    const id = setInterval(()=>{
      loadJobs().catch(()=>undefined);
      api.updateCourierLocation({courierId:courierId.trim(),latitude:currentLocation.coordinates.latitude,longitude:currentLocation.coordinates.longitude}).catch(()=>undefined);
    },6000);
    return ()=>clearInterval(id);
  },[courierId,currentLocation.coordinates.latitude,currentLocation.coordinates.longitude]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroIconWrap}><Ionicons name="bicycle" size={24} color="#F59E0B"/></View>
          <View style={{flex:1}}>
            <Text style={s.heroEyebrow}>Espace livreur</Text>
            <Text style={[s.heroTitle,{textAlign:isRTL?"right":"left"}]}>{t("courier_hub")}</Text>
            <Text style={[s.heroSub,{textAlign:isRTL?"right":"left"}]}>{t("courier_hub_subtitle")}</Text>
          </View>
        </View>

        <AnimatedCard style={s.filterCard}>
          <View style={s.inputWrap}>
            <Ionicons name="id-card-outline" size={16} color="#F59E0B"/>
            <TextInput value={courierId} onChangeText={setCourierId} placeholder={t("courier_id")} placeholderTextColor="#3A3A50"
              style={[s.input,{textAlign:isRTL?"right":"left"}]}/>
          </View>
          <ScalePressable containerStyle={s.refreshBtn} onPress={loadJobs}>
            <Ionicons name={loading?"refresh":"refresh-outline"} size={16} color="#0A0A0F"/>
            <Text style={s.refreshBtnText}>{loading?"...":t("courier_refresh")}</Text>
          </ScalePressable>
        </AnimatedCard>

        <Text style={[s.sectionTitle,{textAlign:isRTL?"right":"left"}]}>{t("courier_available_jobs")}</Text>
        {dashboard?.availableJobs.length ? dashboard.availableJobs.map((job,index)=>(
          <AnimatedCard key={job.id} delay={Math.min(index*60,240)} style={s.jobCard}>
            <View style={s.jobHeader}>
              <View style={s.jobAvailBadge}><Text style={s.jobAvailBadgeText}>Disponible</Text></View>
              <Text style={s.jobTitle}>{job.restaurantName}</Text>
            </View>
            {[{icon:"location-outline" as const,label:t("courier_pickup"),val:job.pickupAddress},{icon:"flag-outline" as const,label:t("courier_destination"),val:job.destinationAddress},{icon:"map-outline" as const,label:t("distance"),val:`${job.deliveryDistanceKm.toFixed(1)} km`}].map(r=>(
              <View key={r.label} style={s.jobRow}>
                <Ionicons name={r.icon} size={13} color="#F59E0B"/>
                <Text style={s.jobMeta}>{r.label}: <Text style={{color:"#F5F0E8"}}>{r.val}</Text></Text>
              </View>
            ))}
            <View style={s.jobFooter}>
              <View style={s.gainWrap}>
                <Text style={s.gainLabel}>Gain estimé</Text>
                <Text style={s.gainVal}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
              </View>
              <ScalePressable containerStyle={s.acceptBtn} onPress={()=>acceptJob(job.id)}>
                <Text style={s.acceptBtnText}>{t("courier_accept")}</Text>
                <Ionicons name="checkmark" size={14} color="#0A0A0F"/>
              </ScalePressable>
            </View>
          </AnimatedCard>
        )) : <EmptyState title={t("courier_no_jobs")} message={t("courier_no_jobs_msg")}/>}

        <Text style={[s.sectionTitle,{textAlign:isRTL?"right":"left"}]}>{t("courier_active_jobs")}</Text>
        {(dashboard?.activeJobs||[]).map((job,index)=>(
          <AnimatedCard key={job.id} delay={Math.min(index*60,240)} style={s.jobCard}>
            <View style={s.jobHeader}>
              <View style={s.jobActiveBadge}><Text style={s.jobActiveBadgeText}>En cours</Text></View>
              <Text style={s.jobTitle}>{job.restaurantName}</Text>
            </View>
            <Text style={s.jobMeta}>{job.customer?.name} · {job.customer?.phone}</Text>
            <Text style={s.jobMeta}>{job.customer?.address}</Text>
            <Text style={s.gainVal}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
            {dashboard?.courier.currentLat!=null&&dashboard?.courier.currentLng!=null&&job.pickupCoordinates&&job.destinationCoordinates?(
              <LiveDeliveryMap pickup={job.pickupCoordinates} destination={job.destinationCoordinates} courier={{latitude:dashboard.courier.currentLat,longitude:dashboard.courier.currentLng}} title="Position live" subtitle="Synchronisée en temps réel."/>
            ):null}
          </AnimatedCard>
        ))}

        <Text style={[s.sectionTitle,{textAlign:isRTL?"right":"left"}]}>{t("courier_history")}</Text>
        {(dashboard?.history||[]).map((job,index)=>(
          <AnimatedCard key={job.id} delay={Math.min(index*50,200)} style={s.histCard}>
            <View style={s.histLeft}>
              <Text style={s.histTitle}>{job.restaurantName}</Text>
              <Text style={s.histDate}>{formatDateTime(job.createdAt,language)}</Text>
            </View>
            <Text style={s.histGain}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
          </AnimatedCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{padding:18,gap:16,paddingBottom:48},
  hero:{flexDirection:"row",alignItems:"flex-start",gap:14,backgroundColor:"#12121A",borderRadius:24,padding:18,borderWidth:1,borderColor:"#2A2A3A"},
  heroIconWrap:{width:50,height:50,borderRadius:25,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  heroEyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  heroTitle:{color:"#F5F0E8",fontSize:24,fontWeight:"900"},
  heroSub:{color:"#9B9BB0",lineHeight:20,fontSize:13},
  filterCard:{backgroundColor:"#12121A",borderRadius:20,borderWidth:1,borderColor:"#2A2A3A",padding:16,gap:12},
  inputWrap:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#16161F",borderRadius:16,borderWidth:1,borderColor:"#2A2A3A",paddingHorizontal:14},
  input:{flex:1,color:"#F5F0E8",paddingVertical:14,fontSize:14},
  refreshBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"#F59E0B",borderRadius:16,paddingVertical:13},
  refreshBtnText:{color:"#0A0A0F",fontWeight:"900"},
  sectionTitle:{color:"#F5F0E8",fontSize:20,fontWeight:"900"},
  jobCard:{backgroundColor:"#12121A",borderRadius:22,borderWidth:1,borderColor:"#2A2A3A",padding:16,gap:10},
  jobHeader:{flexDirection:"row",alignItems:"center",gap:10},
  jobAvailBadge:{backgroundColor:"rgba(52,211,153,0.12)",borderRadius:999,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:"rgba(52,211,153,0.25)"},
  jobAvailBadgeText:{color:"#34D399",fontWeight:"800",fontSize:11},
  jobActiveBadge:{backgroundColor:"rgba(245,158,11,0.12)",borderRadius:999,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:"rgba(245,158,11,0.25)"},
  jobActiveBadgeText:{color:"#F59E0B",fontWeight:"800",fontSize:11},
  jobTitle:{color:"#F5F0E8",fontSize:17,fontWeight:"900",flex:1},
  jobRow:{flexDirection:"row",alignItems:"center",gap:6},
  jobMeta:{color:"#9B9BB0",lineHeight:20,fontSize:13},
  jobFooter:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:4},
  gainWrap:{gap:2},
  gainLabel:{color:"#5C5C70",fontSize:11,fontWeight:"700",textTransform:"uppercase"},
  gainVal:{color:"#34D399",fontWeight:"900",fontSize:18},
  acceptBtn:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#F59E0B",borderRadius:14,paddingHorizontal:16,paddingVertical:11},
  acceptBtnText:{color:"#0A0A0F",fontWeight:"900",fontSize:13},
  histCard:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:"#12121A",borderRadius:18,borderWidth:1,borderColor:"#2A2A3A",padding:14},
  histLeft:{gap:3},
  histTitle:{color:"#F5F0E8",fontWeight:"800",fontSize:14},
  histDate:{color:"#5C5C70",fontSize:12},
  histGain:{color:"#34D399",fontWeight:"900",fontSize:16},
});
