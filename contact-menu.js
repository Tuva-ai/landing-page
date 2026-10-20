// Shared "Get in touch" menu. Every .contact-menu opens on mouse-over, or on
// click/tap/keyboard, to offer "Schedule a call" and "Interest form". The
// interest item opens a Typeform popup once the embed has loaded and stays a
// plain new-tab link otherwise.
(function () {
    const TF_JS = 'https://embed.typeform.com/next/embed.js';
    const TF_CSS = 'https://embed.typeform.com/next/css/popup.css';
    const CLOSE_DELAY = 150;
    const menus = [];
    const popups = {};
    let tfRequested = false;

    // Load Typeform's embed the first time any menu opens, unless the page already has it
    function loadTypeform() {
        if (tfRequested) return;
        tfRequested = true;
        try {
            if (!document.querySelector('.contact-pop [data-tf-form]')) return;
            if (!document.querySelector('link[href*="embed.typeform.com/next/css/popup.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = TF_CSS;
                document.head.appendChild(link);
            }
            if (!window.tf && !document.querySelector('script[src*="embed.typeform.com/next/embed.js"]')) {
                const script = document.createElement('script');
                script.src = TF_JS;
                script.async = true;
                document.head.appendChild(script);
            }
        } catch (e) {}
    }

    function openTypeform(item) {
        const id = item.getAttribute('data-tf-form');
        if (!id || !window.tf || typeof window.tf.createPopup !== 'function') return false;
        const ga = item.getAttribute('data-ga') || '';
        const at = ga.indexOf('contact_form_');
        const surface = at < 0 ? '' : ga.slice(at + 'contact_form_'.length);
        const key = id + '|' + surface;
        try {
            if (!popups[key]) {
                popups[key] = window.tf.createPopup(id, {
                    hidden: { utm_source: 'tuva-website', utm_medium: location.pathname, utm_content: surface }
                });
            }
            popups[key].open();
            return true;
        } catch (e) {
            return false;
        }
    }

    function setup(menu) {
        const trigger = menu.querySelector('.contact-trigger');
        const pop = menu.querySelector('.contact-pop');
        if (!trigger || !pop || menu.classList.contains('is-ready')) return;
        menu.classList.add('is-ready');
        trigger.setAttribute('aria-expanded', 'false');
        if (!pop.hasAttribute('aria-label')) pop.setAttribute('aria-label', trigger.textContent.trim());

        const items = () => Array.prototype.slice.call(pop.querySelectorAll('[role="menuitem"]'));
        const isOpen = () => menu.classList.contains('is-open');
        let timer = null;
        let byHover = false;

        function open(hover) {
            clearTimeout(timer);
            menus.forEach((m) => { if (m.menu !== menu) m.close(); });
            if (isOpen()) return;
            byHover = hover;
            menu.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            // Right-aligned by default; flip if that would run off the left edge
            pop.classList.remove('to-left');
            if (pop.getBoundingClientRect().left < 8) pop.classList.add('to-left');
            loadTypeform();
        }

        function close() {
            clearTimeout(timer);
            byHover = false;
            if (!isOpen()) return;
            menu.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function focusItem(index) {
            const list = items();
            if (!list.length) return;
            list[(index + list.length) % list.length].focus();
        }

        // Hover only for pointers that can hover; a tap goes through the click handler
        menu.addEventListener('pointerenter', (e) => {
            if (e.pointerType === 'mouse') open(true);
        });
        menu.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse' || !isOpen()) return;
            if (pop.contains(document.activeElement)) return;
            clearTimeout(timer);
            timer = setTimeout(close, CLOSE_DELAY);
        });

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isOpen()) open(false);
            else if (byHover) byHover = false; // opened by hover: the click keeps it open
            else close();
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (isOpen()) close(); else open(false);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                open(false);
                focusItem(e.key === 'ArrowDown' ? 0 : -1);
            }
        });

        pop.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const i = items().indexOf(document.activeElement);
            focusItem(i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1));
        });

        menu.addEventListener('focusout', (e) => {
            if (!menu.contains(e.relatedTarget)) close();
        });

        items().forEach((item) => {
            item.addEventListener('click', (e) => {
                const hadFocus = pop.contains(document.activeElement);
                close();
                if (hadFocus) trigger.focus();
                if (item.hasAttribute('data-tf-form') && openTypeform(item)) e.preventDefault();
            });
        });

        menus.push({
            menu: menu,
            close: close,
            escape: function () {
                if (!isOpen()) return;
                const hadFocus = menu.contains(document.activeElement);
                close();
                if (hadFocus) trigger.focus();
            }
        });
    }

    function init() {
        document.querySelectorAll('.contact-menu').forEach(setup);
        if (!menus.length) return;
        document.addEventListener('pointerdown', (e) => {
            menus.forEach((m) => { if (!m.menu.contains(e.target)) m.close(); });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') menus.forEach((m) => m.escape());
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
