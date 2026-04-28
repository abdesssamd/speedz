import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { QuantityControl } from "../components/QuantityControl";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, cartRestaurant, getCartSummary, updateCartItemQuantity, removeCartItem, promoCode, setPromoCode, applyPromoCode, t, isRTL } = useApp();
  const summary = getCartSummary();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <LinearGradient colors={["#0A0A0F","#1a1207","#92400E"]} style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroEyebrow}>Votre commande</Text>
              <Text style={[s.heroTitle,{textAlign:isRTL?"right":"left"}]}>{t("cart_title")}</Text>
            </View>
            <View style={s.heroIconWrap}><Ionicons name="bag-outline" size={22} color="#F59E0B" /></View>
          </View>
          <Text style={[s.heroSub,{textAlign:isRTL?"right":"left"}]}>
            {cartRestaurant?`${t("current_order_at")} ${cartRestaurant.name}`:t("no_item_yet")}
          </Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}><Text style={s.heroStatVal}>{cart.length}</Text><Text style={s.heroStatLbl}>Articles</Text></View>
            <View style={s.heroStatDivider}/>
            <View style={s.heroStat}><Text style={s.heroStatVal}>{summary.estimatedDeliveryLabel}</Text><Text style={s.heroStatLbl}>ETA</Text></View>
            <View style={s.heroStatDivider}/>
            <View style={s.heroStat}><Text style={s.heroStatVal}>{formatCurrency(summary.total)}</Text><Text style={s.heroStatLbl}>Total</Text></View>
          </View>
        </LinearGradient>

        <FlatList
          data={cart} keyExtractor={(item)=>item.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          renderItem={({item,index})=>(
            <AnimatedCard delay={Math.min(index*60,220)} style={s.itemCard}>
              <Image source={{uri:item.image}} style={s.itemImg}/>
              <View style={s.itemBody}>
                <View style={s.itemTop}>
                  <Text style={[s.itemName,{textAlign:isRTL?"right":"left",flex:1}]}>{item.name}</Text>
                  <ScalePressable containerStyle={s.deleteBtn} onPress={()=>Alert.alert(t("delete_item_title"),t("delete_item_message"),[{text:t("cancel"),style:"cancel"},{text:t("delete"),style:"destructive",onPress:()=>removeCartItem(item.id)}])}>
                    <Ionicons name="trash-outline" size={14} color="#F87171"/>
                  </ScalePressable>
                </View>
                <Text style={[s.itemOptions,{textAlign:isRTL?"right":"left"}]}>
                  {item.selectedOptions.length?item.selectedOptions.map(o=>o.choiceName).join(", "):t("no_option")}
                </Text>
                {item.specialInstructions?<Text style={[s.itemNote,{textAlign:isRTL?"right":"left"}]}>📝 {item.specialInstructions}</Text>:null}
                <View style={s.itemBottom}>
                  <Text style={s.itemPrice}>{formatCurrency((item.basePrice+item.selectedOptions.reduce((sum,o)=>sum+o.priceDelta,0))*item.quantity)}</Text>
                  <QuantityControl quantity={item.quantity} onDecrease={()=>updateCartItemQuantity(item.id,item.quantity-1)} onIncrease={()=>updateCartItemQuantity(item.id,item.quantity+1)}/>
                </View>
              </View>
            </AnimatedCard>
          )}
          ListEmptyComponent={<EmptyState title={t("empty_cart")} message={t("empty_cart_msg")}/>}
          ListFooterComponent={cart.length?(
            <AnimatedCard style={s.summaryCard}>
              <Text style={s.promoLabel}>{t("promo_code")}</Text>
              <View style={s.promoRow}>
                <View style={s.promoInputWrap}>
                  <Ionicons name="pricetag-outline" size={14} color="#F59E0B"/>
                  <TextInput value={promoCode} onChangeText={setPromoCode} placeholder={t("promo_placeholder")} placeholderTextColor="#3A3A50" style={[s.promoInput,{textAlign:isRTL?"right":"left"}]}/>
                </View>
                <ScalePressable containerStyle={s.promoBtn} onPress={()=>applyPromoCode(promoCode)}>
                  <Text style={s.promoBtnText}>{t("apply_promo")}</Text>
                </ScalePressable>
              </View>
              <View style={s.divider}/>
              {[{label:t("subtotal"),val:formatCurrency(summary.subtotal)},{label:t("delivery"),val:`${formatCurrency(summary.deliveryFee)} · ${summary.deliveryDistanceKm} km`},{label:t("applied_rate"),val:summary.deliveryTierLabel},{label:t("service_fee"),val:formatCurrency(summary.serviceFee)}].map((row)=>(
                <View key={row.label} style={s.summaryRow}>
                  <Text style={s.summaryLbl}>{row.label}</Text>
                  <Text style={s.summaryVal}>{row.val}</Text>
                </View>
              ))}
              {summary.discountAmount?(<View style={s.summaryRow}><Text style={s.summaryLbl}>{t("discount")}</Text><Text style={s.discountVal}>- {formatCurrency(summary.discountAmount)}</Text></View>):null}
              <View style={s.divider}/>
              <View style={s.summaryRow}><Text style={s.totalLbl}>{t("total")}</Text><Text style={s.totalVal}>{formatCurrency(summary.total)}</Text></View>
              <View style={s.pointsRow}>
                <Ionicons name="star" size={13} color="#F59E0B"/>
                <Text style={s.pointsText}>{t("order_points")} <Text style={{color:"#F59E0B",fontWeight:"800"}}>{summary.pointsToEarn} pts</Text></Text>
              </View>
            </AnimatedCard>
          ):<View/>}
        />

        <ScalePressable containerStyle={[s.checkoutBtn,!cart.length&&s.checkoutBtnDisabled]} disabled={!cart.length} onPress={()=>navigation.navigate("Checkout")}>
          <LinearGradient colors={["#D97706","#F59E0B"]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.checkoutGradient}>
            <Text style={s.checkoutText}>{t("checkout")}</Text>
            <View style={s.checkoutArrow}><Ionicons name="arrow-forward" size={16} color="#0A0A0F"/></View>
          </LinearGradient>
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{flex:1,paddingHorizontal:14,paddingTop:12,gap:14},
  hero:{borderRadius:26,padding:18,gap:12,borderWidth:1,borderColor:"#2A2A3A"},
  heroTop:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between"},
  heroEyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4},
  heroTitle:{color:"#F5F0E8",fontSize:28,fontWeight:"900"},
  heroIconWrap:{width:46,height:46,borderRadius:23,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  heroSub:{color:"#9B9BB0",fontWeight:"600",fontSize:13},
  heroStats:{flexDirection:"row",alignItems:"center",backgroundColor:"rgba(0,0,0,0.3)",borderRadius:18,padding:14,borderWidth:1,borderColor:"#2A2A3A"},
  heroStat:{flex:1,alignItems:"center",gap:3},
  heroStatVal:{color:"#F5F0E8",fontWeight:"900",fontSize:15},
  heroStatLbl:{color:"#5C5C70",fontSize:11,fontWeight:"700"},
  heroStatDivider:{width:1,height:30,backgroundColor:"#2A2A3A"},
  listContent:{gap:12,paddingBottom:120},
  itemCard:{flexDirection:"row",gap:12,backgroundColor:"#12121A",borderRadius:22,borderWidth:1,borderColor:"#2A2A3A",padding:12},
  itemImg:{width:88,height:88,borderRadius:18},
  itemBody:{flex:1,gap:7},
  itemTop:{flexDirection:"row",alignItems:"flex-start",gap:8},
  itemName:{color:"#F5F0E8",fontWeight:"900",fontSize:16,lineHeight:20},
  deleteBtn:{width:32,height:32,borderRadius:16,backgroundColor:"rgba(248,113,113,0.1)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(248,113,113,0.2)"},
  itemOptions:{color:"#9B9BB0",fontSize:12,lineHeight:17,fontWeight:"600"},
  itemNote:{color:"#F59E0B",fontSize:12,lineHeight:17,fontStyle:"italic"},
  itemBottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  itemPrice:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  summaryCard:{backgroundColor:"#12121A",borderRadius:24,padding:18,gap:12,borderWidth:1,borderColor:"#2A2A3A"},
  promoLabel:{color:"#9B9BB0",fontSize:11,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.8},
  promoRow:{flexDirection:"row",gap:10},
  promoInputWrap:{flex:1,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#16161F",borderRadius:14,borderWidth:1,borderColor:"#2A2A3A",paddingHorizontal:12},
  promoInput:{flex:1,color:"#F5F0E8",paddingVertical:12,fontSize:14},
  promoBtn:{backgroundColor:"rgba(245,158,11,0.1)",borderRadius:14,paddingHorizontal:14,justifyContent:"center",paddingVertical:12,borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  promoBtnText:{color:"#F59E0B",fontWeight:"900",fontSize:13},
  divider:{height:1,backgroundColor:"#1E1E2C",marginVertical:4},
  summaryRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  summaryLbl:{color:"#9B9BB0",fontWeight:"600",fontSize:13},
  summaryVal:{color:"#F5F0E8",fontWeight:"800",fontSize:13},
  discountVal:{color:"#34D399",fontWeight:"900"},
  totalLbl:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  totalVal:{color:"#F59E0B",fontWeight:"900",fontSize:22},
  pointsRow:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(245,158,11,0.07)",borderRadius:12,padding:10,borderWidth:1,borderColor:"rgba(245,158,11,0.15)"},
  pointsText:{color:"#9B9BB0",fontSize:13,fontWeight:"600"},
  checkoutBtn:{position:"absolute",left:14,right:14,bottom:18,borderRadius:20,overflow:"hidden"},
  checkoutBtnDisabled:{opacity:0.4},
  checkoutGradient:{flexDirection:"row",alignItems:"center",justifyContent:"center",paddingVertical:16,gap:12},
  checkoutText:{color:"#0A0A0F",fontWeight:"900",fontSize:16},
  checkoutArrow:{width:30,height:30,borderRadius:15,backgroundColor:"rgba(0,0,0,0.15)",alignItems:"center",justifyContent:"center"},
});
