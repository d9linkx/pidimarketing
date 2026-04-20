/**
 * V Do Marketing - Unified Interactive Engine
 * Combined: Side Drawer, Top Bar, Sticky Nav, Exit Modal, & Cookies
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GLOBAL SELECTORS ---
    const body = document.body;
    const header = document.querySelector('.main-nav');
    const menuTrigger = document.getElementById('menu-trigger');
    const closeMenu = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    
    // Top Bar Selectors
    const langSelector = document.querySelector('.lang-selector');
    const langTrigger = document.querySelector('.lang-trigger');
    const langDropdown = document.querySelector('.lang-dropdown');
    const activeLangSpan = document.querySelector('.active-lang');

    // Modal & Banner Selectors
    const exitModal = document.getElementById('exit-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cookieBanner = document.querySelector('.cookie-banner');

    // --- 2. MENU DRAWER LOGIC ---
    if (menuTrigger && sideMenu) {
        const toggleMenu = (open) => {
            sideMenu.classList.toggle('is-open', open);
            menuTrigger.classList.toggle('is-active', open);
            
            if (open) {
                body.classList.add('menu-open');
            } else {
                body.classList.remove('menu-open');
            }
        };

        menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            const isOpen = sideMenu.classList.contains('is-open');
            toggleMenu(!isOpen);
        });

        if (closeMenu) {
            closeMenu.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMenu(false);
            });
        }

        // Close when clicking a link inside the drawer
        sideMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });
    }

    // --- 3. LANGUAGE DROPDOWN LOGIC ---
    if (langTrigger && langDropdown) {
        langTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            langSelector.classList.toggle('is-open');
            langDropdown.classList.toggle('show');
        });

        langDropdown.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', function() {
                const langCode = this.getAttribute('data-lang') || "EN";
                if (activeLangSpan) activeLangSpan.textContent = langCode;
                
                langSelector.classList.remove('is-open');
                langDropdown.classList.remove('show');
            });
        });
    }

    // --- 4. GLOBAL CLICK-TO-CLOSE (Drawer & Dropdown) ---
    document.addEventListener('click', (e) => {
        // Close Drawer if clicking outside
        if (sideMenu?.classList.contains('is-open') && 
            !sideMenu.contains(e.target) && 
            !menuTrigger.contains(e.target)) {
            
            sideMenu.classList.remove('is-open');
            menuTrigger.classList.remove('is-active');
            body.classList.remove('menu-open');
        }

        // Close Lang Dropdown if clicking outside
        if (langDropdown?.classList.contains('show') && !langSelector.contains(e.target)) {
            langSelector.classList.remove('is-open');
            langDropdown.classList.remove('show');
        }
    });

    // Close everything on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            sideMenu?.classList.remove('is-open');
            menuTrigger?.classList.remove('is-active');
            body.classList.remove('menu-open');
            langDropdown?.classList.remove('show');
        }
    });

    // --- 5. STICKY HEADER SCROLL ---
    if (header) {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                scrollTimeout = null;
            }, 15);
        });
    }

    // --- 6. EXIT-INTENT MODAL ---
    if (exitModal) {
        let modalShown = localStorage.getItem('exitModalShown');

        if (!modalShown) {
            document.addEventListener('mouseleave', (e) => {
                if (e.clientY < 0 && !localStorage.getItem('exitModalShown')) {
                    exitModal.classList.add('show');
                    localStorage.setItem('exitModalShown', 'true');
                }
            });
        }

        const hideModal = () => exitModal.classList.remove('show');
        if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
        window.addEventListener('click', (e) => { if (e.target === exitModal) hideModal(); });
    }

    // --- 7. COOKIE BANNER ---
    if (cookieBanner) {
        const acceptCookies = cookieBanner.querySelector('.btn-orange');
        
        if (localStorage.getItem('cookiesAccepted') === 'true') {
            cookieBanner.style.display = 'none';
        } else if (acceptCookies) {
            acceptCookies.addEventListener('click', () => {
                cookieBanner.classList.add('hide');
                localStorage.setItem('cookiesAccepted', 'true');
                setTimeout(() => { cookieBanner.style.display = 'none'; }, 500);
            });
        }
    }
});






// --- 8. HERO AUDIT FORM ---
    const auditForm = document.querySelector('.audit-form');
    
    if (auditForm) {
        auditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = auditForm.querySelector('button');
            const websiteUrl = auditForm.querySelector('input').value;
            
            // UI Feedback
            const originalHTML = submitBtn.innerHTML;
            const arrow = submitBtn.querySelector('svg')?.outerHTML || '';
            submitBtn.innerHTML = `Analyzing... ${arrow}`;
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            // Simulate the analysis delay
            setTimeout(() => {
                console.log(`Starting analysis for: ${websiteUrl}`);
                // Redirect to your product test page or result page
                window.location.href = `https://avantaland.vercel.app/product-test.html?url=${encodeURIComponent(websiteUrl)}`;
            }, 1500);
        });
    }
