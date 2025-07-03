// Check if browser supports CSS :has() pseudo-class
if (CSS.supports('selector(:has(div))')) {
    console.log('Browser supports :has() - using CSS-only palette switching');
} else {
    console.log('Browser does not support :has() - implementing JavaScript fallback');
    const body = document.body;
    const paletteLinks = document.querySelectorAll('a[href^="#palet"]');
    paletteLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('href').substring(1); // Remove #
            body.dataset.palette = targetId;
        });
    });
}