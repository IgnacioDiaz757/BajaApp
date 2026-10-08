import { StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '../stores/preferences';
import { getLegalDoc, type LegalKind } from '../legal/render';
import { colors, Screen, themedStyles, TopBar } from './ui/primitives';

/** Pantalla con un documento legal (política de privacidad, términos, etc.). */
export function LegalDocument({ kind, subtitle }: { kind: LegalKind; subtitle: string }) {
  const language = usePreferences((state) => state.language);
  const doc = getLegalDoc(kind, language);

  return (
    <Screen scroll>
      <TopBar title={doc.title} subtitle={subtitle} back />
      <Text style={styles.intro}>{doc.intro}</Text>
      {doc.sections.map((section) => (
        <View key={section.h} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>{section.h}</Text>
          {section.p?.map((text) => <Text key={text} style={styles.paragraph}>{text}</Text>)}
          {section.ul?.map((text) => (
            <View key={text} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  section: { marginTop: 18, gap: 8 },
  heading: { color: colors.text, fontSize: 14, fontWeight: '700' },
  paragraph: { color: colors.secondary, fontSize: 12, lineHeight: 19 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  bullet: { color: colors.primary, fontSize: 12, lineHeight: 19 },
  bulletText: { flex: 1, color: colors.secondary, fontSize: 12, lineHeight: 19 },
}));
