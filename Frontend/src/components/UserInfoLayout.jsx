import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export default function UserInfoLayout({
  title,
  subtitle,
  icon = 'information-circle',
  variant = 'brand',
  children,
}) {
  const router = useRouter();
  const accent = ACCENTS[variant] || ACCENTS.brand;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <View style={[styles.titleIcon, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
          <View style={styles.topBarText}>
            <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={styles.topSubtitle} numberOfLines={2}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const ACCENTS = {
  brand: Colors.primary,
  help: '#059669',
  privacy: '#4338CA',
};

export function InfoCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function InfoSectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function InfoBullet({ icon = 'checkmark-circle', color = Colors.primary, children }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={18} color={color} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function InfoParagraph({ children }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function ContactRow({ icon, label, value, isFirst = false }) {
  return (
    <View style={[styles.contactRow, isFirst && styles.contactRowFirst]}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.contactText}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
    </View>
  );
}

/** Simple grouped section — clean header + white body card */
export function SimpleSection({ icon, title, children, accent = Colors.primary }) {
  return (
    <View style={styles.simpleSection}>
      <View style={styles.simpleSectionHead}>
        <View style={[styles.simpleSectionIcon, { backgroundColor: `${accent}12` }]}>
          <Ionicons name={icon} size={17} color={accent} />
        </View>
        <Text style={styles.simpleSectionTitle}>{title}</Text>
      </View>
      <View style={styles.simpleSectionBody}>{children}</View>
    </View>
  );
}

/** Help — question & answer pair */
export function FaqItem({ question, answer, isLast = false }) {
  return (
    <View style={[styles.faqItem, isLast && styles.faqItemLast]}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
}

/** Help — numbered step */
export function StepItem({ number, text, isLast = false }) {
  return (
    <View style={[styles.stepItem, isLast && styles.stepItemLast]}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepCircleText}>{number}</Text>
      </View>
      <Text style={styles.stepItemText}>{text}</Text>
    </View>
  );
}

/** Privacy — section inside one document card */
export function PolicySection({ title, children, isLast = false }) {
  return (
    <View style={[styles.policySection, !isLast && styles.policySectionBorder]}>
      <Text style={styles.policySectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Privacy — soft bullet line */
export function SimpleBullet({ children }) {
  return (
    <View style={styles.simpleBulletRow}>
      <View style={styles.simpleDot} />
      <Text style={styles.simpleBulletText}>{children}</Text>
    </View>
  );
}

/** Soft callout banner */
export function SoftTip({ icon = 'bulb-outline', children, color = Colors.primary }) {
  return (
    <View style={[styles.softTip, { backgroundColor: `${color}0D` }]}>
      <Ionicons name={icon} size={18} color={color} style={styles.softTipIcon} />
      <Text style={[styles.softTipText, { color }]}>{children}</Text>
    </View>
  );
}

export function IconTopicRow({ icon, title, text, color = Colors.success }) {
  return (
    <View style={styles.topicRow}>
      <View style={[styles.topicIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.topicBody}>
        <Text style={styles.topicTitle}>{title}</Text>
        <Text style={styles.topicText}>{text}</Text>
      </View>
    </View>
  );
}

export function HelpGroupTitle({ icon, title, color = Colors.success }) {
  return (
    <View style={styles.helpGroupHead}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.helpGroupTitle, { color }]}>{title}</Text>
    </View>
  );
}

export function PolicyBlock({ icon, title, accent = Colors.primary, children }) {
  return (
    <View style={[styles.policyBlock, { borderLeftColor: accent }]}>
      <View style={[styles.policyBadge, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={styles.policyTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function PolicyLine({ icon = 'ellipse', text, accent = Colors.primary }) {
  return (
    <View style={styles.policyLine}>
      <Ionicons name={icon} size={14} color={accent} style={styles.policyLineIcon} />
      <Text style={styles.policyLineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topBarText: {
    flex: 1,
  },
  topBarSpacer: {
    width: 42,
  },
  topTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.slate900,
  },
  topSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
    lineHeight: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  simpleSection: {
    marginBottom: 22,
  },
  simpleSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  simpleSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  simpleSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.slate800,
  },
  simpleSectionBody: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  faqItem: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  faqItemLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  faqQuestion: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.slate800,
    lineHeight: 22,
    marginBottom: 6,
  },
  faqAnswer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 22,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  stepItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.primary,
  },
  stepItemText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 21,
  },
  policySection: {
    paddingVertical: 16,
  },
  policySectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  policySectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.slate800,
    marginBottom: 10,
  },
  simpleBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  simpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  simpleBulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 22,
  },
  softTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  softTipIcon: {
    marginRight: 10,
  },
  softTipText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.slate800,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate600,
    lineHeight: 21,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  contactRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.slate800,
    marginTop: 2,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topicBody: {
    flex: 1,
    paddingTop: 2,
  },
  topicTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.slate800,
    marginBottom: 4,
  },
  topicText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
  },
  helpGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  helpGroupTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  policyBlock: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  policyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.slate800,
    marginBottom: 10,
  },
  policyLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  policyLineIcon: {
    marginRight: 10,
    marginTop: 3,
  },
  policyLineText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
  },
});
