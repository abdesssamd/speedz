import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Coordinates } from "../types";

type LiveDeliveryMapProps = {
  pickup: Coordinates;
  destination: Coordinates;
  courier?: Coordinates | null;
  title?: string;
  subtitle?: string;
};

function projectPoint(point: Coordinates, minLat: number, maxLat: number, minLng: number, maxLng: number) {
  const width = 100;
  const height = 100;
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  const latSpan = Math.max(maxLat - minLat, 0.01);

  return {
    left: ((point.longitude - minLng) / lngSpan) * width,
    top: height - ((point.latitude - minLat) / latSpan) * height,
  };
}

export function LiveDeliveryMap({ pickup, destination, courier, title, subtitle }: LiveDeliveryMapProps) {
  const projected = useMemo(() => {
    const latitudes = [pickup.latitude, destination.latitude, courier?.latitude ?? pickup.latitude];
    const longitudes = [pickup.longitude, destination.longitude, courier?.longitude ?? pickup.longitude];
    const minLat = Math.min(...latitudes) - 0.01;
    const maxLat = Math.max(...latitudes) + 0.01;
    const minLng = Math.min(...longitudes) - 0.01;
    const maxLng = Math.max(...longitudes) + 0.01;

    return {
      pickup: projectPoint(pickup, minLat, maxLat, minLng, maxLng),
      destination: projectPoint(destination, minLat, maxLat, minLng, maxLng),
      courier: courier ? projectPoint(courier, minLat, maxLat, minLng, maxLng) : null,
    };
  }, [courier, destination, pickup]);

  const routeWidth = Math.max(Math.abs(projected.destination.left - projected.pickup.left), 8);
  const routeHeight = Math.max(Math.abs(projected.destination.top - projected.pickup.top), 8);
  const routeLeft = Math.min(projected.destination.left, projected.pickup.left);
  const routeTop = Math.min(projected.destination.top, projected.pickup.top);

  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.mapFrame}>
        <View style={[styles.road, { left: `${routeLeft}%`, top: `${routeTop}%`, width: `${routeWidth}%`, height: `${routeHeight}%` }]} />
        <View style={[styles.marker, styles.pickupMarker, { left: `${projected.pickup.left}%`, top: `${projected.pickup.top}%` }]}>
          <Text style={styles.markerText}>R</Text>
        </View>
        <View
          style={[
            styles.marker,
            styles.destinationMarker,
            { left: `${projected.destination.left}%`, top: `${projected.destination.top}%` },
          ]}
        >
          <Text style={styles.markerText}>C</Text>
        </View>
        {projected.courier ? (
          <View style={[styles.marker, styles.courierMarker, { left: `${projected.courier.left}%`, top: `${projected.courier.top}%` }]}>
            <Text style={styles.markerText}>M</Text>
          </View>
        ) : null}
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.pickupMarker]} />
          <Text style={styles.legendText}>Restaurant</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.courierMarker]} />
          <Text style={styles.legendText}>Moto</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.destinationMarker]} />
          <Text style={styles.legendText}>Client</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 16,
    gap: 12,
  },
  title: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748B",
    lineHeight: 18,
  },
  mapFrame: {
    height: 190,
    borderRadius: 18,
    backgroundColor: "#F7F5F2",
    overflow: "hidden",
    position: "relative",
  },
  road: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#F97316",
    borderStyle: "dashed",
    opacity: 0.7,
  },
  marker: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  markerText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
  },
  pickupMarker: {
    backgroundColor: "#111827",
  },
  courierMarker: {
    backgroundColor: "#F97316",
  },
  destinationMarker: {
    backgroundColor: "#16A34A",
  },
  gridHorizontal: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    top: "33%",
    bottom: "33%",
  },
  gridVertical: {
    ...StyleSheet.absoluteFillObject,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    left: "33%",
    right: "33%",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
});
