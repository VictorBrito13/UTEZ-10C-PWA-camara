'use strict';

(function () {
  const estadoEl = document.getElementById('estado');
  const btnInstalar = document.getElementById('btn-instalar');
  const ayudaIos = document.getElementById('ayuda-ios');

  let eventoInstalacionDiferido = null;

  function actualizarEstado(mensaje, tono) {
    estadoEl.textContent = mensaje;
    if (tono) {
      estadoEl.dataset.tono = tono;
    } else {
      delete estadoEl.dataset.tono;
    }
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
          actualizarEstado('Instalación aceptada. Busca el icono de la app en tu pantalla de inicio.', 'ok');
        } else {
          actualizarEstado('Instalación cancelada. Puedes intentarlo de nuevo desde el botón «Instalar app».');
        }
      })
      .catch((error) => {
        actualizarEstado(`No se pudo completar la instalación: ${error.message}`, 'error');
      })
      .finally(() => {
        eventoInstalacionDiferido = null;
        btnInstalar.disabled = false;
      });
  });

  window.addEventListener('appinstalled', () => {
    eventoInstalacionDiferido = null;
    btnInstalar.hidden = true;
    actualizarEstado('Aplicación instalada correctamente.', 'ok');
  });

  window.addEventListener('load', registrarServiceWorker);

  function prepararAvisoIos() {
    if (esIos() && !esModoStandalone()) {
      ayudaIos.hidden = false;
    }
  }

  prepararAvisoIos();
})();
