/**
 * B3 Labs Website - Main JavaScript
 * Handles scroll animations, lazy loading, and interactions
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Initialize all modules
    initScrollAnimations();
    initImageLoading();
    initSmoothScroll();
    initCardSkeletons();
  }

  /**
   * Scroll-triggered animations using Intersection Observer
   * Animates elements with [data-animate] attribute when they enter viewport
   */
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    if (!animatedElements.length) return;

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Add animated class with slight delay for smooth effect
            setTimeout(() => {
              entry.target.classList.add('animated');
            }, 50);
            
            // Stop observing once animated
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
      });

      // Observe each element
      animatedElements.forEach(el => {
        observer.observe(el);
      });
    } else {
      // Fallback for older browsers - just show everything
      animatedElements.forEach(el => {
        el.classList.add('animated');
      });
    }
  }

  /**
   * Handle image loading states
   * Adds loaded class to cards when images finish loading
   */
  function initImageLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    images.forEach(img => {
      // If image is already loaded
      if (img.complete) {
        handleImageLoad(img);
      } else {
        img.addEventListener('load', () => handleImageLoad(img));
        img.addEventListener('error', () => handleImageError(img));
      }
    });

    // Also handle hero images (eager loaded)
    const heroImages = document.querySelectorAll('img[loading="eager"]');
    heroImages.forEach(img => {
      if (img.complete) {
        handleImageLoad(img);
      } else {
        img.addEventListener('load', () => handleImageLoad(img));
      }
    });
  }

  /**
   * Handle successful image load
   */
  function handleImageLoad(img) {
    const card = img.closest('.card');
    if (card) {
      card.classList.add('loaded');
    }
    
    // Remove skeleton if exists
    const skeleton = img.closest('.card')?.querySelector('.card-skeleton');
    if (skeleton) {
      skeleton.style.display = 'none';
    }
  }

  /**
   * Handle image load error
   */
  function handleImageError(img) {
    console.warn('Failed to load image:', img.src);
    const card = img.closest('.card');
    if (card) {
      card.classList.add('loaded');
    }
  }

  /**
   * Initialize card skeleton loading states
   * Cards show skeleton until images load
   */
  function initCardSkeletons() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      // If card has no image or image is already loaded, hide skeleton
      const img = card.querySelector('img');
      if (!img || img.complete) {
        const skeleton = card.querySelector('.card-skeleton');
        if (skeleton) {
          skeleton.style.display = 'none';
        }
        card.classList.add('loaded');
      }
    });
  }

  /**
   * Enhanced smooth scroll for anchor links
   * Accounts for fixed headers if present
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#"
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          const headerOffset = 24; // Account for scroll-padding-top
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  /**
   * Performance: Debounce function for scroll events
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Performance: Throttle function for frequent events
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Optional: Add scroll progress indicator (can be enabled if needed)
  // function initScrollProgress() {
  //   const progressBar = document.createElement('div');
  //   progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:2px;background:var(--action);z-index:9999;transition:width 0.1s;';
  //   document.body.appendChild(progressBar);
  //   
  //   window.addEventListener('scroll', throttle(() => {
  //     const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  //     const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  //     const scrolled = (winScroll / height) * 100;
  //     progressBar.style.width = scrolled + '%';
  //   }, 50));
  // }
  
  // Initialize contact form
  initContactForm();
  
})();

/**
 * Contact form handling with validation and submission
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit');
  const formSuccess = document.getElementById('contact-success');
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Basic validation
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    
    if (!name || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    submitBtn.style.opacity = '0.7';
    
    try {
      // Submit form using Formspree
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        // Success - hide form, show success message
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        
        // Track conversion in Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'form_submit', {
            'event_category': 'Contact',
            'event_label': 'Build Page Form'
          });
        }
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Something went wrong. Please try again or email us directly at ops@b3labs.vc');
      
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      submitBtn.style.opacity = '1';
    }
  });
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
