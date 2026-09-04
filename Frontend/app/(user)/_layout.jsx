import { Drawer } from 'expo-router/drawer';
import SidebarContent from '../../src/components/sidebar-content';
import { Colors } from '../../src/constants/colors';
import useStudentAccessGuard from '../../src/hooks/useStudentAccessGuard';
import { UserNotificationProvider } from '../../src/context/UserNotificationContext';

export default function UserLayout() {
  useStudentAccessGuard();

  return (
    <UserNotificationProvider>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: '82%',
            backgroundColor: Colors.admin.sidebar,
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
            drawerItemStyle: { display: 'none' },
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
          name="MyRequests/index"
          options={{
            drawerLabel: 'My Requests',
            title: 'My Requests',
          }}
        />
        <Drawer.Screen
          name="Notifications/index"
          options={{
            drawerLabel: 'Notifications',
            title: 'Notifications',
          }}
        />
        <Drawer.Screen
          name="MyProfile/index"
          options={{
            drawerLabel: 'My Profile',
            title: 'My Profile',
          }}
        />
        <Drawer.Screen
          name="AllItems/index"
          options={{
            drawerItemStyle: { display: 'none' },
            title: 'All Items',
          }}
        />
      </Drawer>
    </UserNotificationProvider>
  );
}
