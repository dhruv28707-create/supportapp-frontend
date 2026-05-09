import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

export default function BlurTabBarBackground() {
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
