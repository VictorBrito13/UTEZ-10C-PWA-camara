'use strict';

(function () {
  const estadoEl = document.getElementById('estado');
  const btnInstalar = document.getElementById('btn-instalar');
  const ayudaIos = document.getElementById('ayuda-ios');

  const visorVideo = document.getElementById('visor-camara');
  const visorVacio = document.getElementById('visor-vacio');
  const chipModo = document.getElementById('chip-modo');

  const avisoPermiso = document.getElementById('aviso-permiso');
  const avisoLente = document.getElementById('aviso-lente');

  const btnPreparar = document.getElementById('btn-preparar-camara');
  const btnConfirmar = document.getElementById('btn-confirmar-permiso');
  const btnCancelar = document.getElementById('btn-cancelar-permiso');
  const btnAlternar = document.getElementById('btn-alternar-camara');
  const btnApagar = document.getElementById('btn-apagar-camara');

  let eventoInstalacionDiferido = null;
  let streamActual = null;
  let modoCamaraActual = 'environment';

  function actualizarMensajeEstado(mensaje, tono) {
    estadoEl.textContent = mensaje;
    if (tono) {
      estadoEl.dataset.tono = tono;
    } else {
      delete estadoEl.dataset.tono;
    }
  }

  function nombreLente(modo) {
    return modo === 'environment' ? 'trasera' : 'frontal';
  }

  function esModoStandalone() {
    const porMediaQuery = window.matchMedia('(display-mode: standalone)').matches;
    const porSafari = window.navigator.standalone === true;
    return porMediaQuery || porSafari;
  }

  function esIos() {
    const ua = window.navigator.userAgent || '';
    const esDispositivoIos = /iphone|ipad|ipod/i.test(ua);
    const esIpadModerno = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    return esDispositivoIos || esIpadModerno;
  }

  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker no disponible en este navegador.');
      return;
    }

    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado. Ámbito:', registro.scope);
      })
      .catch((error) => {
        console.warn('No se pudo registrar el Service Worker:', error.message);
      })
      .finally(() => {
        console.log('Registro de Service Worker finalizado.');
      });
  }

  function detenerCamaraActiva() {
    if (streamActual) {
      streamActual.getTracks().forEach((track) => {
        track.stop();
      });
      streamActual = null;
    }
    visorVideo.srcObject = null;
    visorVideo.classList.remove('espejo');
  }

  function actualizarControles() {
    const camaraActiva = streamActual !== null;

    visorVacio.hidden = camaraActiva;
    chipModo.hidden = !camaraActiva;
    chipModo.textContent = camaraActiva ? nombreLente(modoCamaraActual) : '';

    btnPreparar.hidden = camaraActiva;
    btnAlternar.hidden = !camaraActiva;
    btnApagar.hidden = !camaraActiva;

    btnAlternar.textContent = `Cambiar a cámara ${nombreLente(modoCamaraActual === 'environment' ? 'user' : 'environment')}`;
    avisoLente.textContent = nombreLente(modoCamaraActual);
  }

  function manejarErrorCamara(error) {
    const nombre = error && error.name ? error.name : 'ErrorDesconocido';

    if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
      actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.', 'error');
      return;
    }

    if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError') {
      actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.', 'error');
      return;
    }

    if (nombre === 'NotReadableError' || nombre === 'TrackStartError') {
      actualizarMensajeEstado('La cámara está siendo usada por otra aplicación. Cierra esa app e inténtalo de nuevo.', 'error');
      return;
    }

    if (nombre === 'OverconstrainedError' || nombre === 'ConstraintNotSatisfiedError') {
      actualizarMensajeEstado('Este dispositivo no soporta el modo de cámara solicitado. Prueba con la otra lente.', 'error');
      return;
    }

    if (nombre === 'SecurityError') {
      actualizarMensajeEstado('El navegador bloqueó la cámara por seguridad. Verifica que el sitio use HTTPS.', 'error');
      return;
    }

    if (nombre === 'NotSupportedError') {
      actualizarMensajeEstado('El acceso a cámara no está soportado en este navegador.', 'error');
      return;
    }

    actualizarMensajeEstado(`Error al acceder al hardware: ${error.message || nombre}`, 'error');
  }

  function iniciarCamara(modo) {
    detenerCamaraActiva();

    if (!window.isSecureContext) {
      actualizarMensajeEstado('La cámara requiere un contexto seguro (HTTPS o localhost).', 'error');
      actualizarControles();
      return Promise.resolve();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      actualizarMensajeEstado('Este navegador no expone la API getUserMedia.', 'error');
      actualizarControles();
      return Promise.resolve();
    }

    const restricciones = {
      video: { facingMode: { ideal: modo } },
      audio: false
    };

    btnPreparar.disabled = true;
    btnConfirmar.disabled = true;
    btnAlternar.disabled = true;

    actualizarMensajeEstado(`Solicitando acceso a la cámara ${nombreLente(modo)}…`);

    return navigator.mediaDevices.getUserMedia(restricciones)
      .then((stream) => {
        streamActual = stream;
        visorVideo.srcObject = stream;
        visorVideo.classList.toggle('espejo', modo === 'user');

        const reproduccion = visorVideo.play();
        if (reproduccion && typeof reproduccion.catch === 'function') {
          reproduccion.catch(() => {});
        }

        actualizarMensajeEstado(`Cámara activa (${nombreLente(modo)}). El video se muestra solo en este dispositivo.`, 'ok');
      })
      .catch((error) => {
        manejarErrorCamara(error);
      })
      .finally(() => {
        btnPreparar.disabled = false;
        btnConfirmar.disabled = false;
        btnAlternar.disabled = false;
        actualizarControles();
      });
  }

  function consultarPermisoCamara() {
    if (!navigator.permissions || !navigator.permissions.query) {
      return Promise.resolve('desconocido');
    }

    return navigator.permissions.query({ name: 'camera' })
      .then((estadoPermiso) => estadoPermiso.state)
      .catch(() => 'desconocido');
  }

  btnPreparar.addEventListener('click', () => {
    actualizarControles();

    consultarPermisoCamara()
      .then((estadoPermiso) => {
        if (estadoPermiso === 'denied') {
          avisoPermiso.hidden = true;
          actualizarMensajeEstado('El permiso de cámara está bloqueado en este sitio. Ábrelo desde el candado de la barra de direcciones o los ajustes del navegador.', 'error');
          return;
        }

        avisoPermiso.hidden = false;
        avisoPermiso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(() => {
        avisoPermiso.hidden = false;
      });
  });

  btnConfirmar.addEventListener('click', () => {
    avisoPermiso.hidden = true;
    iniciarCamara(modoCamaraActual);
  });

  btnCancelar.addEventListener('click', () => {
    avisoPermiso.hidden = true;
    actualizarMensajeEstado('Acción cancelada. La cámara no se encendió.');
  });

  btnAlternar.addEventListener('click', () => {
    modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
    actualizarMensajeEstado(`Cambiando a cámara ${nombreLente(modoCamaraActual)}…`);
    iniciarCamara(modoCamaraActual);
  });

  btnApagar.addEventListener('click', () => {
    detenerCamaraActiva();
    visorVideo.srcObject = null;
    actualizarControles();
    actualizarMensajeEstado('Cámara apagada. El sensor quedó liberado.');
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    eventoInstalacionDiferido = event;
    btnInstalar.hidden = false;
  });

  btnInstalar.addEventListener('click', () => {
    if (!eventoInstalacionDiferido) {
      return;
    }

    btnInstalar.disabled = true;
    eventoInstalacionDiferido.prompt();

    eventoInstalacionDiferido.userChoice
      .then((resultado) => {
        if (resultado.outcome === 'accepted') {
          btnInstalar.hidden = true;
          actualizarMensajeEstado('Instalación aceptada. Busca el icono de la app en tu pantalla de inicio.', 'ok');
        } else {
          actualizarMensajeEstado('Instalación cancelada. Puedes intentarlo de nuevo desde el botón «Instalar app».');
        }
      })
      .catch((error) => {
        actualizarMensajeEstado(`No se pudo completar la instalación: ${error.message}`, 'error');
      })
      .finally(() => {
        eventoInstalacionDiferido = null;
        btnInstalar.disabled = false;
      });
  });

  window.addEventListener('appinstalled', () => {
    eventoInstalacionDiferido = null;
    btnInstalar.hidden = true;
    actualizarMensajeEstado('Aplicación instalada correctamente.', 'ok');
  });

  window.addEventListener('load', registrarServiceWorker);

  function prepararAvisoIos() {
    if (esIos() && !esModoStandalone()) {
      ayudaIos.hidden = false;
    }
  }

  prepararAvisoIos();
  actualizarControles();
})();
