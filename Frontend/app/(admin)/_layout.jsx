import { Drawer } from 'expo-router/drawer';
import AdminSidebarContent from '../../src/components/AdminSidebarContent';
import { Colors } from '../../src/constants/colors';

export default function AdminLayout() {
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
      drawerContent={(props) => <AdminSidebarContent {...props} />}
    >
      <Drawer.Screen
        name="DashBoard/index"
        options={{
          drawerLabel: 'Overview',
          title: 'Admin Dashboard',
        }}
      />
      <Drawer.Screen
        name="PendingReports/index"
        options={{
          drawerLabel: 'Pending Reports',
          title: 'Pending Reports',
        }}
      />
      <Drawer.Screen
        name="AllUsers/index"
        options={{
          drawerLabel: 'All Users',
          title: 'University Students',
        }}
      />
      <Drawer.Screen
        name="AllItems/index"
        options={{
          drawerLabel: 'All Items',
          title: 'Property Logs',
        }}
      />
      <Drawer.Screen
        name="Lost/index"
        options={{
          drawerLabel: 'Report Lost',
          title: 'Report Lost',
        }}
      />
      <Drawer.Screen
        name="Found/index"
        options={{
          drawerLabel: 'Report Found',
          title: 'Report Found',
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
          title: 'Admin Profile',
        }}
      />
      <Drawer.Screen
        name="ChangePassword/index"
        options={{
          drawerLabel: 'Change Password',
          title: 'Change Password',
        }}
      />
      <Drawer.Screen
        name="ReturnedItems/index"
        options={{
          drawerLabel: 'Returned Items',
          title: 'Returned Archives',
        }}
      />
      <Drawer.Screen
        name="ConfirmedMatches/index"
        options={{
          drawerLabel: 'Confirmed Matches',
          title: 'Confirmed Matches',
        }}
      />
      <Drawer.Screen
        name="item/[id]"
        options={{
          drawerLabel: () => null,
          title: 'Item Details',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="matches/compare"
        options={{
          drawerLabel: () => null,
          title: 'Match Compare',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
