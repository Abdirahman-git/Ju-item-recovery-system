import { Drawer } from 'expo-router/drawer';
import AdminSidebarContent from '../../src/components/AdminSidebarContent';
import { Colors } from '../../src/constants/colors';

export default function AdminLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: '82%',
          backgroundColor: '#0f2d6b',
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
          title: 'Campus users',
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
        name="Drafts/index"
        options={{
          drawerLabel: 'Drafts',
          title: 'Draft Items',
        }}
      />
      <Drawer.Screen
        name="Lost/index"
        options={{
          drawerLabel: 'Register Item',
          title: 'Register Item',
        }}
      />
      <Drawer.Screen
        name="Found/index"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Legacy Found Draft',
        }}
      />
      <Drawer.Screen
        name="SecureFound/index"
        options={{
          drawerLabel: 'Secure Lost',
          title: 'Secure Lost Hold',
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
        name="SystemReports/index"
        options={{
          drawerLabel: 'System Reports',
          title: 'System Reports',
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
        name="MatchClaims/index"
        options={{
          drawerLabel: 'Ownership Requests',
          title: 'Ownership Requests',
        }}
      />
      <Drawer.Screen
        name="MatchClaims/detail/[id]"
        options={{
          drawerLabel: () => null,
          title: 'Claim Details',
          drawerItemStyle: { display: 'none' },
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
    </Drawer>
  );
}
