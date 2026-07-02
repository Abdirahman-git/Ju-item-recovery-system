import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserInfoLayout, {
  InfoCard,
  InfoParagraph,
  ContactRow,
} from '../../../src/components/UserInfoLayout';
import { Colors } from '../../../src/constants/colors';

const POLICY_SECTIONS = [
  {
    title: 'Data we collect',
    icon: 'folder-open-outline',
    points: [
      'Student ID, name, email, and phone from university records during account activation.',
      'Login credentials used to authenticate your account.',
      'Lost and found report details: item name, description, place, date, and optional photo.',
      'Claim notes submitted when selecting "This is mine".',
    ],
  },
  {
    title: 'Data we do not keep',
    icon: 'shield-outline',
    points: [
      'OTP verification codes are temporary and are not stored permanently.',
    ],
  },
  {
    title: 'How we use data',
    icon: 'settings-outline',
    points: [
      'Create and manage user accounts.',
      'Show approved campus lost & found listings.',
      'Support communication between reporters and claimers.',
      'Allow admins to review reports and claims fairly.',
      'Send verification and reset OTP messages.',
    ],
  },
  {
    title: 'Visibility, photos, and sharing',
    icon: 'image-outline',
    points: [
      'Reporter contact details may be visible on approved listings.',
      'Listings are intended for registered university users.',
      'Uploaded photos are used only for item identification and moderation.',
      'We do not sell personal data to third parties.',
    ],
  },
  {
    title: 'Retention and policy updates',
    icon: 'refresh-outline',
    points: [
      'Reports stay until approved, returned, archived, or removed by administrators.',
      'Account records remain while your student account is active.',
      'Policy updates may occur; continued use means you accept new terms.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <UserInfoLayout
      variant="privacy"
      title="Privacy Policy"
      subtitle="Clear, transparent, and student-focused"
      icon="shield-checkmark"
    >
      <InfoCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.updatedPill}>
            <Text style={styles.updatedText}>Updated · June 2026</Text>
          </View>
          <View style={styles.securePill}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.success} />
            <Text style={styles.secureText}>Secure handling</Text>
          </View>
        </View>
        <InfoParagraph>
          JU Item Recovery respects your privacy. This page explains exactly what data is collected,
          why it is needed, and how we protect student information in plain language.
        </InfoParagraph>
      </InfoCard>

      <View style={styles.highlightsRow}>
        <View style={styles.highlightCard}>
          <Ionicons name="eye-off-outline" size={17} color={Colors.primary} />
          <Text style={styles.highlightLabel}>No data selling</Text>
        </View>
        <View style={styles.highlightCard}>
          <Ionicons name="person-circle-outline" size={17} color={Colors.primary} />
          <Text style={styles.highlightLabel}>Student-only use</Text>
        </View>
        <View style={styles.highlightCard}>
          <Ionicons name="server-outline" size={17} color={Colors.primary} />
          <Text style={styles.highlightLabel}>Admin moderated</Text>
        </View>
      </View>

      {POLICY_SECTIONS.map((section) => (
        <InfoCard key={section.title} style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name={section.icon} size={18} color={Colors.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <View style={styles.pointDot} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </InfoCard>
      ))}

      <InfoCard>
        <Text style={styles.contactTitle}>Questions about privacy?</Text>
        <ContactRow isFirst icon="business-outline" label="Office" value="Lost & Found — Jazeera University" />
        <ContactRow icon="mail-outline" label="Email" value="support@jazeerauniversity.edu.so" />
        <ContactRow icon="location-outline" label="Campus" value="Mogadishu, Somalia" />
      </InfoCard>
    </UserInfoLayout>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  updatedPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
  },
  updatedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primaryDark,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
  },
  secureText: {
    marginLeft: 6,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.success,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  highlightLabel: {
    marginTop: 6,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate600,
    textAlign: 'center',
  },
  sectionCard: {
    paddingTop: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.slate900,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 10,
  },
  pointText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
  },
  contactTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.slate800,
    marginBottom: 4,
  },
});
