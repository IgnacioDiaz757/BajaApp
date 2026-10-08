import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

// Portadas cuadradas (1:1) de tamaño fijo: entran 3 por fila en un celular.
const COVER_SIZE = 88;

// Portadas generadas con `node scripts/build-covers.js`.
const games = [
  { route: '/games/racing', title: 'Carrera', cover: require('../../../assets/games/racing/cover.png') },
  { route: '/games/dreamcat', title: 'Gato Soñador', cover: require('../../../assets/games/dreamcat/cover.png') },
  { route: '/games/blockrunner', title: 'Block Runner', cover: require('../../../assets/games/blockrunner/cover.png') },
  { route: '/games/nightchase', title: 'Night Chase', cover: require('../../../assets/games/nightchase/cover.png') },
  { route: '/games/skyflap', title: 'Sky Flap', cover: require('../../../assets/games/skyflap/cover.png') },
  { route: '/games/snake', title: 'Snake', cover: require('../../../assets/games/snake/cover.png') },
] as const;

export default function GamesScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <TopBar title={t('Juegos')} subtitle={t('JUEGOS')} back />
      <View style={styles.grid}>
        {games.map((game) => (
          <Pressable
            key={game.route}
            accessibilityRole="button"
            accessibilityLabel={t(game.title)}
            onPress={() => router.push(game.route)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <Image source={game.cover} style={styles.cover} resizeMode="cover" />
            <Text numberOfLines={1} style={styles.name}>{t(game.title)}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingBottom: 24 },
  tile: { width: COVER_SIZE, gap: 6 },
  pressed: { opacity: 0.7 },
  cover: { width: COVER_SIZE, height: COVER_SIZE, borderRadius: 12, backgroundColor: colors.border },
  name: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
}));
