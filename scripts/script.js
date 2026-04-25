/**
 * /Users/mac/Desktop/PIDI/scripts/script.js
 * V Do Marketing - Unified Interactive Engine
 * Combined: Side Drawer, Top Bar, Sticky Nav, Exit Modal, & Cookies
 */

import { supabase } from '../supabaseClient.js';

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

    // User Dropdown Selectors
    const userBtn = document.querySelector('.user-profile-nav .user-avatar-btn');
    const userDropdown = document.querySelector('.user-profile-nav .user-dropdown');

    let toggleMenu = () => {};

    // --- 2. MENU DRAWER LOGIC ---
    if (menuTrigger && sideMenu) {
        toggleMenu = (open) => {
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
            // Use the consistent toggleMenu function for closing
            toggleMenu(false);
        }

        // Close Lang Dropdown if clicking outside
        if (langDropdown?.classList.contains('show') && !langSelector.contains(e.target)) {
            langSelector.classList.remove('is-open');
            langDropdown.classList.remove('show');
        }

        // Close User Dropdown if clicking outside
        if (userDropdown?.classList.contains('show') && !userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    // Close everything on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            sideMenu?.classList.remove('is-open');
            menuTrigger?.classList.remove('is-active');
            body.classList.remove('menu-open');
            // Also close user dropdown and lang dropdown on escape
            langDropdown?.classList.remove('show');
            userDropdown?.classList.remove('show');
        }
    });

    // --- 11. USER DROPDOWN LOGIC ---
    if (userBtn && userDropdown) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            userDropdown.classList.toggle('show');
            // Update user info in dropdown if needed
            checkSession();
        });
    }

    // --- 5. STICKY HEADER SCROLL ---
    if (header) {
        const heroSection = document.getElementById('hero');
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                // Trigger transition when the header passes the hero section
                const threshold = heroSection ? heroSection.offsetHeight - 100 : 50;
                
                if (window.scrollY > threshold) {
                    header.classList.add('scrolled');
                    body.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                    body.classList.remove('scrolled');
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


    // --- 9. DYNAMIC FOOTER LOAD ---
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.outerHTML = data;
                if(typeof lucide !== 'undefined') lucide.createIcons();
            });
    }

    // --- 10. AUTH & DASHBOARD REDIRECTS ---
    async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        const userProfileNav = document.querySelector('.user-profile-nav');
        const loginLink = document.querySelector('.user-dropdown a[href="login.html"]');
        const dashboardLink = document.querySelector('.user-dropdown a[href="dashboard.html"]');
        const logoutButton = document.querySelector('.user-dropdown a[href="dashboard.html?logout=true"]');

        if (session) {
            // User is logged in
            const user = session.user;
            const userName = user.user_metadata.full_name || user.email;
            const userRole = user.user_metadata.user_role || 'creator'; // Default role

            // Update profile display
            if (userProfileNav) {
                userProfileNav.querySelector('img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6a26da&color=fff`;
                // You might want to display the name somewhere in the nav too
            }

            // Update dropdown links
            if (loginLink) loginLink.style.display = 'none';
            if (dashboardLink) dashboardLink.style.display = 'flex'; // Show dashboard link
            if (logoutButton) {
                logoutButton.style.display = 'flex';
                logoutButton.onclick = handleLogout; // Attach logout function
            }

            // Update Earn/Grow links to point to dashboard with specific views
            document.querySelectorAll('a[href="earn.html"]').forEach(link => {
                link.href = `dashboard.html?view=performer`;
            });
            document.querySelectorAll('a[href="grow.html"]').forEach(link => {
                link.href = `dashboard.html?view=creator`;
            });
        } else {
            // User is not logged in
            if (loginLink) loginLink.style.display = 'flex';
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
        }
    }
    checkSession(); // Run on page load

    window.handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    };

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
