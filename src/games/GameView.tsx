import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type Props<M> = {
  html: string;
  title: string;
  onMessage: (message: M) => void;
};

// Se inyecta antes de cargar el juego: bloquea el scroll/arrastre de la página para que deslizar el dedo
// (swipes, saltos, giros) lo reciba solo el juego y no mueva la pantalla.
const BLOCK_PAGE_SCROLL = `
  (function () {
    try {
      document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      document.addEventListener('DOMContentLoaded', function () {
        var style = document.createElement('style');
        style.textContent = 'html, body { overscroll-behavior: none; touch-action: none; }';
        document.head.appendChild(style);
      });
    } catch (e) {}
  })();
  true;
`;

/** Muestra un juego HTML: en el celular corre en un WebView; en la web, en un iframe. */
export function GameView<M extends { type: string }>({ html, title, onMessage }: Props<M>) {
  // Se guarda en un ref para que el listener siempre llame a la versión más reciente.
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && 'type' in event.data) handler.current(event.data as M);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {/* En la web se usa un iframe, que acepta el mismo HTML. */}
        <iframe title={title} srcDoc={html} style={{ border: 0, width: '100%', height: '100%', background: '#000' }} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.fill}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        injectedJavaScriptBeforeContentLoaded={BLOCK_PAGE_SCROLL}
        nestedScrollEnabled={false}
        contentInsetAdjustmentBehavior="never"
        onShouldStartLoadWithRequest={(request) => request.url === 'about:blank' || request.url.startsWith('data:') || request.url === 'about:srcdoc'}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            handler.current(JSON.parse(event.nativeEvent.data) as M);
          } catch {
            // mensaje desconocido: se ignora
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
});
