import { Drawer } from 'expo-router/drawer';
import SidebarContent from '../../src/components/sidebar-content';
import { Colors } from '../../src/constants/colors';

export default function UserLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: '75%',
          backgroundColor: '#FFFFFF',
        },
        swipeEdgeWidth: 100, 
      }}
      drawerContent={(props) => <SidebarContent {...props} />}
    >
      <Drawer.Screen
        name="DashBoard/index"
        options={{
          drawerLabel: 'Home',
          title: 'Dashboard',
        }}
      />
      <Drawer.Screen
        name="Lost/index"
        options={{
          drawerLabel: 'Lost Item',
          title: 'Lost Item',
        }}
      />
      <Drawer.Screen
        name="Found/index"
        options={{
          drawerLabel: 'Found Item',
          title: 'Found Item',
        }}
      />
      <Drawer.Screen
        name="MyItems/index"
        options={{
          drawerLabel: 'My Items',
          title: 'My Items',
        }}
      />
      <Drawer.Screen
        name="MyProfile/index"
        options={{
          drawerLabel: 'My Profile',
          title: 'My Profile',
        }}
      />
    </Drawer>
  );
}
