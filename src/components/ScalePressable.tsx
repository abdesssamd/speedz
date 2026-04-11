import React, { PropsWithChildren, useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

type ScalePressableProps = PropsWithChildren<
  PressableProps & {
    containerStyle?: StyleProp<ViewStyle>;
  }
>;

export function ScalePressable({ children, containerStyle, ...props }: ScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
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
