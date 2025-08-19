
(() => {
    const openModal = (m) => {
        if (!m) return;
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
        const first = m.querySelector('[data-autofocus], input, button, textarea, [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
    };

    const closeModal = (m) => {
        if (!m) return;
        m.classList.add('hidden');
        m.setAttribute('aria-hidden', 'true');
        // si no quedan modales abiertos, desbloquear scroll
        const anyOpen = document.querySelector('[data-modal]:not(.hidden)');
        if (!anyOpen) document.body.classList.remove('overflow-hidden');
    };

    // Delegación para abrir por data-modal-target
    document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-modal-target]');
        if (opener) {
            const target = opener.getAttribute('data-modal-target');
            openModal(document.querySelector(target));
        }
    });

    // Delegación para cerrar por data-modal-close
    document.addEventListener('click', (e) => {
        const closer = e.target.closest('[data-modal-close]');
        if (closer) {
            const m = e.target.closest('[data-modal]');
            closeModal(m);
        }
    });

    // Cerrar al clicar fuera (sobre el overlay)
    document.addEventListener('mousedown', (e) => {
        const overlay = e.target;
        if (overlay.matches('[data-modal]')) closeModal(overlay);
    });

    // Cerrar con ESC el último abierto
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = Array.from(document.querySelectorAll('[data-modal]:not(.hidden)'));
        const top = open[open.length - 1];
        if (top) closeModal(top);
    });
})();

// (() => {
//     const openModal = (modal) => {
//         if (!modal) return;
//         modal.classList.remove('hidden');
//         modal.setAttribute('aria-hidden', 'false');
//         modal.dataset.open = "true";
//         // No bloqueamos scroll global si ya hay otro modal abierto
//         const openModals = document.querySelectorAll('[data-modal][data-open="true"]');
//         if (openModals.length === 1) {
//             document.body.classList.add('overflow-hidden');
//         }
//     };

//     const closeModal = (modal) => {
//         if (!modal) return;
//         modal.classList.add('hidden');
//         modal.setAttribute('aria-hidden', 'true');
//         modal.dataset.open = "false";
//         const openModals = document.querySelectorAll('[data-modal][data-open="true"]');
//         if (openModals.length === 0) {
//             document.body.classList.remove('overflow-hidden');
//         }
//     };

//     document.addEventListener('click', (e) => {
//         const trigger = e.target.closest('[data-modal-target]');
//         if (trigger) {
//             const targetSel = trigger.getAttribute('data-modal-target');
//             const modal = document.querySelector(targetSel);

//             if (trigger.hasAttribute('data-modal-stack')) {
//                 // Abrir sin cerrar los demás
//                 openModal(modal);
//             } else {
//                 // Cerrar otros antes de abrir
//                 document.querySelectorAll('[data-modal][data-open="true"]').forEach(closeModal);
//                 openModal(modal);
//             }
//         }

//         const closer = e.target.closest('[data-modal-close]');
//         if (closer) {
//             const modal = e.target.closest('[data-modal]');
//             closeModal(modal);
//         }
//     });

//     // Click fuera del contenido
//     document.addEventListener('mousedown', (e) => {
//         const modal = e.target.closest('[data-modal]');
//         if (modal && e.target === modal) closeModal(modal);
//     });

//     // Cerrar con ESC el último modal abierto
//     document.addEventListener('keydown', (e) => {
//         if (e.key === 'Escape') {
//             const openModals = Array.from(document.querySelectorAll('[data-modal][data-open="true"]'));
//             const last = openModals.pop();
//             if (last) closeModal(last);
//         }
//     });
// })();

(() => {
    const openModal = (m) => {
        if (!m) return;
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        m.dataset.open = "true";
        if (document.querySelectorAll('[data-modal][data-open="true"]').length === 1) {
            document.body.classList.add('overflow-hidden');
        }
    };

    const closeModal = (m) => {
        if (!m) return;
        m.classList.add('hidden');
        m.setAttribute('aria-hidden', 'true');
        m.dataset.open = "false";
        if (!document.querySelector('[data-modal][data-open="true"]')) {
            document.body.classList.remove('overflow-hidden');
        }
    };

    // Abrir (captura)
    const onOpen = (e) => {
        const trigger = e.target.closest('[data-modal-target]');

        if (!trigger) return;

        const dd = trigger.closest('[data-dropdown]');
        if (dd) dd.classList.add('hidden');
        

        if (!trigger) return;
        const sel = trigger.getAttribute('data-modal-target');
        const modal = document.querySelector(sel);
        if (!modal) return;

        if (trigger.hasAttribute('data-modal-stack')) {
            openModal(modal);                 // abre encima sin cerrar el anterior
        } else {
            document.querySelectorAll('[data-modal][data-open="true"]').forEach(closeModal);
            openModal(modal);
        }
    };
    document.addEventListener('click', onOpen, true); // <-- CAPTURA

    // Cerrar por data-modal-close (captura)
    const onCloseBtn = (e) => {
        const closer = e.target.closest('[data-modal-close]');
        if (!closer) return;
        const modal = e.target.closest('[data-modal]');
        if (modal) closeModal(modal);
    };
    document.addEventListener('click', onCloseBtn, true); // <-- CAPTURA

    // Cerrar al hacer click fuera (overlay) (captura para prioridad)
    const onOutside = (e) => {
        const modal = e.target.closest('[data-modal]');
        if (modal && e.target === modal) closeModal(modal);
    };
    document.addEventListener('pointerdown', onOutside, true); // <-- CAPTURA

    // Cerrar con ESC el último abierto
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const stack = Array.from(document.querySelectorAll('[data-modal][data-open="true"]'));
        const top = stack.pop();
        if (top) closeModal(top);
    });
})();