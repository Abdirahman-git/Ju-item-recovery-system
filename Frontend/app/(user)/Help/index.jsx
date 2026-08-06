import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserInfoLayout, {
  InfoCard,
  InfoParagraph,
  ContactRow,
} from '../../../src/components/UserInfoLayout';
import { Colors } from '../../../src/constants/colors';

const FAQ_GROUPS = [
  {
    title: 'Account & Login',
    icon: 'person-circle-outline',
    color: Colors.primary,
    items: [
      {
        q: 'How do I create an account?',
        a: 'Tap Sign Up, enter your Student ID, verify OTP sent to your university email, then set your password.',
      },
      {
        q: 'I forgot my password. What should I do?',
        a: 'On login screen tap Forgot Password, verify OTP, and create a new password.',
      },
    ],
  },
  {
    title: 'Reporting Items',
    icon: 'create-outline',
    color: Colors.warning,
    items: [
      {
        q: 'What information do I need to report an item?',
        a: 'Item name, category, where you lost or found it, date/time, and an optional photo. Your account details are filled in automatically.',
      },
      {
        q: 'What happens after submitting?',
        a: 'Your report enters pending review. After admin approval it becomes visible on Lost or Found feed.',
      },
    ],
  },
  {
    title: 'Claims & Recovery',
    icon: 'shield-checkmark-outline',
    color: Colors.success,
    items: [
      {
        q: 'How do I claim an item?',
        a: 'Open item details, tap This is mine, and write a clear ownership reason.',
      },
      {
        q: 'Can I contact the reporter?',
        a: 'Yes. Use the Call Reporter button when a contact number is available.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <UserInfoLayout
      variant="help"
      title="Help & FAQ"
      subtitle="Fast answers and support guidance"
      icon="help-circle"
    >
      <InfoCard style={styles.heroCard}>
        <View style={styles.heroHead}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="flash-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Support Center</Text>
        </View>
        <InfoParagraph>
          Everything you need to use JU Item Recovery confidently. This page is designed for quick
          reading: short answers, clear sections, and direct contact details.
        </InfoParagraph>
        <View style={styles.tipBar}>
          <Ionicons name="create-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.tipText}>Fill in item name, category, and place clearly.</Text>
        </View>
      </InfoCard>

      <View style={styles.quickRow}>
        <View style={styles.quickCard}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} />
          <Text style={styles.quickLabel}>Pending review</Text>
        </View>
        <View style={styles.quickCard}>
          <Ionicons name="search-outline" size={16} color={Colors.primary} />
          <Text style={styles.quickLabel}>Find items fast</Text>
        </View>
        <View style={styles.quickCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.success} />
          <Text style={styles.quickLabel}>Claim support</Text>
        </View>
      </View>

      {FAQ_GROUPS.map((group) => (
        <InfoCard key={group.title} style={styles.groupCard}>
          <View style={styles.groupHead}>
            <View style={[styles.groupIconWrap, { backgroundColor: `${group.color}18` }]}>
              <Ionicons name={group.icon} size={18} color={group.color} />
            </View>
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>

          {group.items.map((item, idx) => (
            <View
              key={item.q}
              style={[styles.qaRow, idx === group.items.length - 1 && styles.qaRowLast]}
            >
              <Text style={styles.question}>{item.q}</Text>
              <Text style={styles.answer}>{item.a}</Text>
            </View>
          ))}
        </InfoCard>
      ))}

      <InfoCard>
        <Text style={styles.sectionTitle}>Before contacting support</Text>
        <View style={styles.checkRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.checkText}>Confirm Student ID and password are correct.</Text>
        </View>
        <View style={styles.checkRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.checkText}>Keep internet enabled while submitting reports.</Text>
        </View>
        <View style={styles.checkRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.checkText}>Wait for admin approval after submitting reports.</Text>
        </View>
      </InfoCard>

      <InfoCard>
        <Text style={styles.sectionTitle}>Need more help?</Text>
        <ContactRow isFirst icon="business-outline" label="Office" value="Lost & Found — Jazeera University" />
        <ContactRow icon="mail-outline" label="Email" value="support@jazeerauniversity.edu.so" />
        <ContactRow icon="location-outline" label="Campus" value="Mogadishu, Somalia" />
      </InfoCard>
    </UserInfoLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 12,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  heroTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.slate900,
  },
  tipBar: {
    marginTop: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.primaryDark,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    marginTop: 6,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate600,
    textAlign: 'center',
  },
  groupCard: {
    paddingTop: 14,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  groupTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.slate900,
  },
  qaRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingVertical: 12,
  },
  qaRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  question: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.slate800,
    marginBottom: 5,
  },
  answer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.slate900,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  checkText: {
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 19,
  },
});
