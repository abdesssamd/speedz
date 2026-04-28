import React, { PropsWithChildren, useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

type ScalePressableProps = PropsWithChildren<
  PressableProps & {
    containerStyle?: StyleProp<ViewStyle>;
  }
>;

export function ScalePressable({ children, containerStyle, ...props }: ScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: value,
        speed: 35,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: value < 1 ? 0.7 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={[containerStyle, { opacity, transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animateTo(0.98);
          props.onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          props.onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
