declare module "react-native" {
  import type { ComponentType, ReactNode } from "react";

  export type StyleProp<T> = T | T[] | null | undefined;

  export const SafeAreaView: ComponentType<{ style?: StyleProp<unknown>; children?: ReactNode }>;
  export const ScrollView: ComponentType<{ style?: StyleProp<unknown>; contentContainerStyle?: StyleProp<unknown>; children?: ReactNode }>;
  export const StatusBar: ComponentType<{ barStyle?: "dark-content" | "light-content" | "default" }>;
  export const Text: ComponentType<{ style?: StyleProp<unknown>; children?: ReactNode }>;
  export const View: ComponentType<{ style?: StyleProp<unknown>; children?: ReactNode }>;

  export const StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T;
  };
}

