import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DiscoverScreen } from '../screens/DiscoverScreen';
import { AskSuziScreen, ProfileScreen, WindowShopScreen } from '../screens/Placeholders';
import { SavedScreen } from '../screens/SavedScreen';
import { SuziTabBar } from './SuziTabBar';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

/** Five-tab bottom navigator with the custom Suzi tab bar. Order matters: the
 *  3rd tab (AskSuzi) is the raised center button. Picks shows saved folders
 *  (currently the existing SavedScreen, keeping the working save loop intact). */
export function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SuziTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Picks" component={SavedScreen} />
      <Tab.Screen name="AskSuzi" component={AskSuziScreen} />
      <Tab.Screen name="WindowShop" component={WindowShopScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
