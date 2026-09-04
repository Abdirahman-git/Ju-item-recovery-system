import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import UserInfoLayout, {
  InfoCard,
  InfoSectionTitle,
  InfoParagraph,
  InfoBullet,
  ContactRow,
} from '../../../src/components/UserInfoLayout';
import { Colors } from '../../../src/constants/colors';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const JU_CAMPUS = require('../../../assets/images/ju-buding-aboust us.png');

const FEATURES = [
  { icon: 'phone-portrait-outline', text: 'Mobile lost & found reporting from your smartphone' },
  { icon: 'shield-checkmark-outline', text: 'Verified student accounts via university directory & OTP' },
  { icon: 'search-outline', text: 'Search approved campus listings by keyword' },
  { icon: 'images-outline', text: 'Attach photos to help identify items' },
  { icon: 'calendar-outline', text: 'Record date and time when an item was lost or found' },
  { icon: 'people-outline', text: 'Admin review of reports and ownership claims' },
];

export default function AboutUsPage() {
  return (
    <UserInfoLayout
      variant="brand"
      title="About Us"
      subtitle="Jazeera University Item Recovery System (LOFO)"
      icon="information-circle"
    >
      <InfoCard style={styles.brandCard}>
        <Image source={JU_CAMPUS} style={styles.campusImage} resizeMode="cover" />
        <View style={styles.brandBody}>
          <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>JU Item Recovery</Text>
          <Text style={styles.tagline}>Lost & Found — Digital Campus Service</Text>
          <Text style={styles.campusCaption}>Jazeera University — Mogadishu</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>Version 1.0</Text>
          </View>
        </View>
      </InfoCard>

      <InfoCard>
        <InfoSectionTitle>Our mission</InfoSectionTitle>
        <InfoParagraph>
          JU Item Recovery (LOFO) helps Jazeera University students report, search, and recover
          lost belongings through a secure mobile platform. We replace scattered paper notices
          and informal social media posts with one trusted campus system.
        </InfoParagraph>
        <InfoParagraph>
          Every report is linked to a verified student account. Administrators review submissions
          before they go live, and ownership claims are handled fairly through a structured review
          process.
        </InfoParagraph>
      </InfoCard>

      <InfoCard>
        <InfoSectionTitle>What you can do</InfoSectionTitle>
        {FEATURES.map((f) => (
          <InfoBullet key={f.text} icon={f.icon}>
            {f.text}
          </InfoBullet>
        ))}
      </InfoCard>

      <InfoCard>
        <InfoSectionTitle>How recovery works</InfoSectionTitle>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepText}>Student reports a lost or found item on campus</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={styles.stepText}>Admin approves the report for the public feed</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <Text style={styles.stepText}>Others search the feed and submit an ownership claim for admin review</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, styles.stepNumLast]}><Text style={styles.stepNumText}>4</Text></View>
          <Text style={styles.stepText}>Admin confirms return — item archived as recovered</Text>
        </View>
      </InfoCard>

      <InfoCard>
        <InfoSectionTitle>University</InfoSectionTitle>
        <ContactRow isFirst icon="school-outline" label="Institution" value="Jazeera University" />
        <ContactRow icon="location-outline" label="Location" value="Mogadishu, Somalia" />
        <ContactRow icon="globe-outline" label="System" value="JU LOFO — Item Recovery" />
      </InfoCard>
    </UserInfoLayout>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    alignItems: 'stretch',
    padding: 0,
    overflow: 'hidden',
  },
  campusImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.slate100,
  },
  brandBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.slate900,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
  campusCaption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  versionPill: {
    marginTop: 14,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primaryDark,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumLast: {
    marginBottom: 0,
  },
  stepNumText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 21,
    paddingTop: 4,
  },
});
