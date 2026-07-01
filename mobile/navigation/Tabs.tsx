import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DiscoverScreen } from '../screens/DiscoverScreen';
import { FoldersScreen } from '../screens/FoldersScreen';
import { AskSuziScreen, ProfileScreen, WindowShopScreen } from '../screens/Placeholders';
import { SuziTabBar } from './SuziTabBar';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

/** Five-tab bottom navigator with the custom Suzi tab bar. Order matters: the
 *  3rd tab (AskSuzi) is the raised center button. Picks shows the user's folders
 *  (each a saved search / "conversation"); tapping one opens FolderDetail. */
export function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SuziTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Picks" component={FoldersScreen} />
      <Tab.Screen name="AskSuzi" component={AskSuziScreen} />
      <Tab.Screen name="WindowShop" component={WindowShopScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
