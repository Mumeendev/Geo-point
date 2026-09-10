// Mobile Menu Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
            
            // Optional: Animate hamburger to X
            const spans = menuToggle.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('open'));
        });
    }

    // Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
                // Close mobile menu if open
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // -------------------------------------------------------
    // Formspree visitor notification
    // Alerts you when someone enters the website.
    // Uses fetch with keepalive so it doesn't create a
    // browser history entry or navigate away from the site.
    // -------------------------------------------------------
    (function notifyFormspreeVisit() {
        const VISITOR_FORMSPREE_ID = 'mnpqlrzp';

        if (sessionStorage.getItem('formspreeVisitNotified')) return;
        sessionStorage.setItem('formspreeVisitNotified', 'true');

        try {
            const fields = {
                page_url: window.location.href,
                visit_time: new Date().toISOString(),
                user_agent: navigator.userAgent,
                referrer: document.referrer || 'Direct/None',
                screen_resolution: screen.width + 'x' + screen.height,
                language: navigator.language || 'Unknown'
            };

            fetch('https://formspree.io/f/' + VISITOR_FORMSPREE_ID, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(fields),
                keepalive: true
            }).catch(() => {
                // Silently ignore network errors for the visit notification
            });
        } catch (err) {
            console.warn('Formspree visit notification failed:', err);
        }
    }());
});
