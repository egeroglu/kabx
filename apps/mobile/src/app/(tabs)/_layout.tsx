import Tabs from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="today" />
      <Tabs.Screen name="wardrobe" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="outfits" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
