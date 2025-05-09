// DOM Elements
const header = document.querySelector('.header');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const parallaxBgs = document.querySelectorAll('.parallax-bg');
const sections = document.querySelectorAll('section');

// Performance optimization: Store the initial position of elements to avoid reflows
let lastScrollTop = 0;
let ticking = false;
let isMobile = window.innerWidth < 768;
let supportsPassive = false;
let headerHeight = header ? header.offsetHeight : 0; // Cache header height

// Test for passive event support for better performance on mobile
try {
    const opts = Object.defineProperty({}, 'passive', {
        get: function() {
            supportsPassive = true;
            return true;
        }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
} catch (e) {}

// Event listener options
const listenerOpts = supportsPassive ? { passive: true } : false;

// Main JavaScript file for EaseUp website
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Fix for testimonials and contact pages opening in new windows
    console.log('DOM fully loaded and parsed');
    
    // Find all testimonial and contact links and ensure they have no target attribute
    document.querySelectorAll('a[href*="testimonials.html"], a[href*="contact.html"]').forEach(link => {
        console.log('Found link:', link.getAttribute('href'));
        // Remove any target attributes
        if (link.hasAttribute('target')) {
            console.log('Removing target attribute from:', link.getAttribute('href'));
            link.removeAttribute('target');
        }
        
        // Add explicit click handler to prevent opening in new window
        link.addEventListener('click', function(e) {
            console.log('Link clicked:', this.getAttribute('href'));
            // Don't add any preventDefault, just log the click
        });
    });

    // Check for mobile device on load - do this first!
    checkMobile();
    
    // Initialize all components
    initNavigation();
    initParallaxEffect();
    initScrollAnimations();
    initMobileMenu();
    initFaqAccordion();
    
    // Force the header to be visible on page load
    header.style.transform = 'translateY(0)';
    header.classList.remove('hidden');
    
    // Add resize listener to handle orientation changes
    window.addEventListener('resize', function() {
        // Check if we're now on mobile after resize
        const wasMobile = isMobile;
        checkMobile();
        
        // If we switched to mobile, ensure header is visible
        if (!wasMobile && isMobile) {
            header.style.transform = 'translateY(0)';
            header.classList.remove('hidden');
        }
        
        // Update parallax on resize
        updateParallax();
        
        // Recalculate header height on resize
        headerHeight = header ? header.offsetHeight : 0;
    }, listenerOpts);
    
    // Call updateParallax once to initialize the state
    updateParallax();
});

/**
 * Check if we're on a mobile device to adjust behaviors
 */
function checkMobile() {
    isMobile = window.innerWidth < 768;
    
    // If on mobile, ensure the header is always visible
    if (isMobile) {
        // Reset header to visible state
        header.style.transform = 'translateY(0)';
        header.classList.remove('hidden');
        
        // Disable parallax on mobile for better performance
        parallaxBgs.forEach(bg => {
            bg.style.transform = 'none';
        });
    }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func The function to debounce
 * @param {Number} wait Wait time in milliseconds
 * @return {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Navigation functionality including scroll behavior and active state
 */
function initNavigation() {
    // Handle scroll events for header behavior
    window.addEventListener('scroll', debounce(function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add scrolled class when scrolling down
        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Hide header when scrolling down, show when scrolling up - BUT NOT ON MOBILE
        if (!isMobile && scrollTop > lastScrollTop && scrollTop > 200) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
        
        // Update active nav link based on scroll position
        updateActiveNavLink();
        
        // Update parallax effect on scroll
        updateParallax();
    }, 10), listenerOpts);
    
    // Handle nav link clicks for smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Check if this link points to contact.html
            const isContactPage = href === 'contact.html' || href.includes('/contact.html');
            
            // If it's the contact page, don't interfere with normal navigation
            if (isContactPage) {
                // Don't prevent default - allow normal navigation in same window
                return;
            }
            
            // Handle the mobile menu
            if (isMobile && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
            
            // Determine if the link is for the current page
            const currentUrl = window.location.pathname + window.location.search;
            const linkUrl = this.pathname + this.search;
            const hash = this.hash;

            // Check if the link is for the same page (in-page navigation)
            const isSamePage = (linkUrl === currentUrl || linkUrl === '' || linkUrl === '/');
            // Check if the hash points to a section on this page
            const targetElement = hash ? document.querySelector(hash) : null;
            const isSectionLink = !!hash && targetElement;
            
            // Only prevent default if it's an in-page section link
            if (isSamePage && isSectionLink) {
                e.preventDefault();
                
                // BUGFIX: Update the URL immediately when navigation is clicked
                // This ensures the hash is updated consistently regardless of scroll position
                const sectionHash = hash; // e.g., "#about"
                history.pushState(null, '', sectionHash);
                
                // Now do the smooth scrolling
                const headerOffset = 70;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
            // Otherwise, allow default navigation (browser will load the correct page/section)
        });
    });
    
    // Set active nav link based on scroll position
    function updateActiveNavLink() {
        if (ticking) return;
        
        ticking = true;
        requestAnimationFrame(() => {
            const scrollPosition = window.scrollY + header.offsetHeight + 20; // Add offset for better section detection
            
            // Check each section's position
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    // Remove active class from all links
                    navLinks.forEach(link => link.classList.remove('active'));
                    
                    // Add active class to current section link
                    const activeLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
            ticking = false;
        });
    }
    
    // Initial call to set active link
    updateActiveNavLink();
}

/**
 * Parallax scrolling effect for background images
 * Creates a subtle movement effect when scrolling
 */
function initParallaxEffect() {
    // Skip parallax on mobile for better performance
    if (isMobile) return;
    
    // Parallax is now handled in updateParallax() 
    // which is called from the main scroll event handler
}

/**
 * Fade-in animations when scrolling
 * Elements appear as they enter the viewport
 */
function initScrollAnimations() {
    // Elements to animate when they enter the viewport
    const featureCards = document.querySelectorAll('.feature-card');
    const userCards = document.querySelectorAll('.user-card');
    const fadeInSections = document.querySelectorAll('.fade-in-section');
    
    // Options for the Intersection Observer
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.15 // 15% of the element must be visible
    };
    
    // Create observer instance
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                entry.target.classList.add('is-visible');
                entry.target.classList.add('visible'); // Add both classes for compatibility
                
                // Special handling for user cards to make them "rise" more dynamically
                if (entry.target.classList.contains('user-card')) {
                    entry.target.style.transitionDelay = `${0.1 + Math.random() * 0.3}s`;
                }
                
                // Stop observing after animation
                if (!entry.target.classList.contains('keep-observing')) {
                    observer.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);
    
    // Observe all sections for fade in animation
    sections.forEach(section => {
        section.classList.add('fade-in');
        observer.observe(section);
    });
    
    // Observe feature cards (staggered animation)
    featureCards.forEach((card, index) => {
        // Add delay based on index for staggered effect
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Observe user cards for simple animations (enhanced separately)
    userCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Observe general fade-in sections
    fadeInSections.forEach(section => {
        observer.observe(section);
    });
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .fade-in {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Mobile menu toggle functionality
 * Includes touch-friendly behaviors
 */
function initMobileMenu() {
    // Ensure hamburger element exists before attaching event listeners
    if (!hamburger) return;
    
    // Add active class to elements for styling
    hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle active class on both hamburger and menu
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
        
        // Add/remove body class to create overlay effect
        document.body.classList.toggle('menu-open');
        
        // Animation handled by CSS transitions now - no need to manually set styles
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideMenu = navMenu.contains(event.target);
        const isClickOnHamburger = hamburger.contains(event.target);
        
        if (!isClickInsideMenu && !isClickOnHamburger && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // Add touch event handling for mobile swipe to close menu
    let touchStartX = 0;
    
    navMenu.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, listenerOpts);
    
    navMenu.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        
        // If swiped left (diff > 0), close the menu
        if (diff > 50) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    }, listenerOpts);
    
    // Close menu when clicking on nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (isMobile) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    });
    
    // Handle escape key to close menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
}

/**
 * Initialize FAQ section with all answers visible by default
 * This simplifies the implementation with no need for click handling
 */
function initFaqAccordion() {
    // Get all FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length === 0) return;
    
    // Make all FAQ answers visible by default
    faqItems.forEach(item => {
        // Add active class to all items
        item.classList.add('active');
        
        // Set the max height of all answers to their scroll height
        const answer = item.querySelector('.faq-answer');
        if (answer) {
            answer.style.maxHeight = 'none'; // Use 'none' instead of scroll height for better rendering
            answer.style.opacity = '1';
            
            // Optional: Add a visible open state to chevrons
            const chevron = item.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-up');
            }
        }
    });
    
    // Remove any click handling for FAQ items
    // All items will remain open for better accessibility
}

// Add CSS for active navigation link
const navStyle = document.createElement('style');
navStyle.textContent = `
    .nav-menu a.active {
        color: var(--primary-color);
        font-weight: 700;
    }
`;
document.head.appendChild(navStyle);

// Smooth scrolling for navigation links - modify to exclude testimonials.html and contact.html
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        // IMPORTANT: Skip any handling for contact and testimonials links
        const href = this.getAttribute('href');
        if (href.includes('contact.html') || href.includes('testimonials.html')) {
            console.log('Skipping smooth scroll for:', href);
            return; // Exit without preventing default
        }
        
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        // BUGFIX: Update URL immediately on click for consistent behavior
        history.pushState(null, '', targetId);
        
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;
        
        // Add offset for fixed header
        const headerHeight = header.offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    });
});

// Parallax Scrolling Effect
function updateParallax() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            
            // Only apply parallax effect on non-mobile devices
            if (!isMobile) {
                // Update parallax backgrounds
                parallaxBgs.forEach(bg => {
                    // Performance optimization: Apply transform with translateZ for hardware acceleration
                    bg.style.transform = `translateY(${scrollTop * 0.4}px) translateZ(0)`;
                });
            }
            
            // Header shrink effect on scroll
            if (scrollTop > 100) {
                header.style.padding = '0.5rem 0';
                header.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
                header.classList.add('scrolled');
            } else {
                header.style.padding = '1rem 0';
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                header.classList.remove('scrolled');
            }
            
            // Determine scroll direction
            const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
            lastScrollTop = scrollTop;
            
            // Auto-hide header on scroll down, show on scroll up - BUT ONLY ON DESKTOP
            if (scrollTop > 200 && !isMobile) {
                if (scrollDirection === 'down') {
                    header.style.transform = 'translateY(-100%)';
                    header.classList.add('hidden');
                } else {
                    header.style.transform = 'translateY(0)';
                    header.classList.remove('hidden');
                }
            } else {
                // Always show header on mobile or when at top of page
                header.style.transform = 'translateY(0)';
                header.classList.remove('hidden');
            }
            
            ticking = false;
        });
        
        ticking = true;
    }
}

// --- Amplitude Section Tracking for One-Page Navigation ---
// Tracks when user views a main section and sends a virtual URL to Amplitude
(function() {
    // Map each section to its intended virtual URL
    // 'top' = hero section, 'about' = About EaseUp section
    const sections = [
        { id: 'top', url: '/#top' }, // Hero/top section
        { id: 'about', url: '/#about' }, // About EaseUp section
        { id: 'features', url: '/#features' },
        { id: 'benefits', url: '/#benefits' },
        { id: 'faq', url: '/#faq' }
    ];
    let lastTrackedSection = null;
    let userClickedNav = false; // Track if user recently clicked navigation
    let navClickTimeout = null; // Timeout to reset the userClickedNav flag
    
    // Listen for clicks on navigation links to prevent intersection observer from changing URL hash
    document.querySelectorAll('.nav-menu a[href^="#"]').forEach(link => {
        link.addEventListener('click', () => {
            // Set a flag to indicate user clicked navigation
            userClickedNav = true;
            
            // Clear any existing timeout
            if (navClickTimeout) clearTimeout(navClickTimeout);
            
            // Reset the flag after 1.5 seconds (enough time for scrolling and intersection to occur)
            navClickTimeout = setTimeout(() => {
                userClickedNav = false;
            }, 1500);
        });
    });
    
    // Only run on index.html
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = sections.find(s => s.id === entry.target.id);
                    if (section && lastTrackedSection !== section.id) {
                        // Track section view in Amplitude
                        if (window.amplitude && window.amplitude.track) {
                            amplitude.track('Section Viewed', { virtual_url: section.url });
                        }
                        
                        // Only update URL hash if user hasn't recently clicked a navigation link
                        if (!userClickedNav && window.location.hash !== section.url) {
                            history.replaceState(null, '', section.url);
                        }
                        
                        lastTrackedSection = section.id;
                    }
                }
            });
        }, { threshold: 0.5 }); // 50% of section visible
        
        sections.forEach(section => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });
    }
})(); 