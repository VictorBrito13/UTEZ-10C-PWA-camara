# Inspección Visual PWA

Aplicación web progresiva de vista previa de cámara con **consentimiento explícito antes de solicitar el permiso nativo** y procesamiento 100% local. Práctica de los temas 6.1 y 6.2: instalabilidad nativa (`manifest.json`) y acceso ético a cámara frontal/trasera.

- **Demo (GitHub Pages):** https://victorbrito13.github.io/UTEZ-10C-PWA-camara/
- **Repositorio:** https://github.com/VictorBrito13/UTEZ-10C-PWA-camara
- **Stack:** HTML, CSS y JavaScript Vanilla. Sin librerías, sin `async/await`: toda la asincronía usa `.then()` / `.catch()` / `.finally()`.

## Estructura

```
.
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
└── icons/
    ├── icon-192.png              # 192x192 exactos (any maskable)
    ├── icon-512.png              # 512x512 exactos
    └── apple-touch-icon-180.png  # 180x180 para iOS
```

Todas las rutas del manifiesto y del app shell son relativas (`./`) para funcionar dentro del subdirectorio de GitHub Pages.

## Cómo ejecutar en local

El acceso a cámara exige un contexto seguro. `localhost` cuenta como seguro:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`. No uses `file://`: el Service Worker y `getUserMedia` no funcionan ahí.

## Despliegue en GitHub Pages

1. Sube el contenido del repositorio a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**; Branch: `main`; Folder: `/ (root)`.
4. Espera el build y abre `https://<usuario>.github.io/<repo>/`.

La app ya está preparada para ese subdirectorio: `start_url`, `scope`, iconos y precache usan rutas relativas.

## Flujo de consentimiento (UX ética)

1. El usuario pulsa **Encender cámara**. La app consulta `navigator.permissions.query({ name: 'camera' })`; si el permiso está bloqueado, explica cómo desbloquearlo en vez de fallar en silencio.
2. Se muestra la tarjeta explicativa: qué cámara se usará, para qué, y que el video nunca sale del dispositivo.
3. Solo al pulsar **Aceptar y encender cámara** se invoca `getUserMedia()`. El navegador muestra su diálogo nativo.

Evitar pulsar «Bloquear» por sorpresa es clave: esa decisión queda guardada por el sistema operativo y JavaScript ya no puede volver a mostrar el diálogo.

## Cámara: detalles técnicos

- `facingMode: { ideal: 'environment' }` para la lente trasera y `'user'` para la frontal.
- Antes de cada cambio de lente se detienen **todas** las pistas del stream anterior: en móvil no se pueden mantener dos sensores abiertos a la vez.
- La vista frontal se muestra espejada con la clase `.espejo` (`transform: scaleX(-1)`), como en las apps nativas.
- Errores diferenciados en `.catch()`: `NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`, `SecurityError`, `NotSupportedError`.
- `<video autoplay playsinline muted>`: `playsinline` evita que iOS/Safari abra el reproductor a pantalla completa.
- **Apagar cámara** detiene los tracks, limpia `srcObject` y libera el sensor.

## Instalabilidad

- `manifest.json` con `display: standalone`, colores de tema y fondo, orientación vertical e iconos PNG reales de 192x192 y 512x512.
- `beforeinstallprompt` interceptado para ofrecer el botón **Instalar app** y `userChoice` para saber si el usuario aceptó.
- `sw.js` con estrategia **Cache First** para el app shell y fallback de navegación a `index.html` cuando no hay red.
- En iOS no existe `beforeinstallprompt`: la app muestra instrucciones manuales (**Compartir → Añadir a pantalla de inicio**) y detecta `display-mode: standalone`.

## Verificación

### Escritorio (DevTools)

1. Abre la URL HTTPS y pulsa `F12`.
2. **Application → Manifest**: sin errores de iconos ni advertencias de instalabilidad.
3. **Application → Service Workers**: el SW debe estar `activated and is running`.
4. **Application → Cache Storage**: debe existir `inspeccion-visual-v1` con el app shell.

### Teléfono (presencial)

1. Abre la URL en Chrome (Android) o Safari (iOS).
2. Pulsa **Instalar app** o usa **Añadir a pantalla de inicio**.
3. Comprueba que abre en ventana independiente, sin barra de direcciones.
4. Pulsa **Encender cámara**: primero aparece el aviso ético, después el diálogo nativo del sistema.
5. Concede el permiso y verifica la alternancia trasera/frontal y el apagado.

### Notas para iPhone / iPad (WebKit)

- No hay `beforeinstallprompt`; la instalación es manual desde el menú Compartir.
- `getUserMedia` solo funciona en HTTPS (GitHub Pages) y requiere un gesto del usuario, no en la carga inicial.
- Algunos modelos tardan en liberar el sensor al alternar lentes; si falla, vuelve a pulsar **Cambiar a cámara**.
- El botón «Instalar app» permanece oculto porque el evento no existe en Safari; en su lugar se muestra la ayuda de instalación.

## Mantenimiento

El Service Worker usa Cache First. Si publicas cambios, sube `CACHE_NAME` en `sw.js` (por ejemplo `inspeccion-visual-v2`), recarga y, si hace falta, cierra y vuelve a abrir la app instalada para que el nuevo SW tome el control.

## Créditos

Práctica académica — Desarrollo de Aplicaciones Web Progresivas (PWA), UTEZ.
