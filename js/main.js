/* ============================================================
   IDEA CZAR — SQUARESPACE CUSTOM SCRIPTS
   Hosted via Cloudflare Pages, loaded in Squarespace footer injection.

   To update: edit this file → push to GitHub → Cloudflare deploys
   automatically → changes live on site within ~60 seconds.

   Table of contents:
     1. Featured Work list — hover overlay injection
     2. Hero H1 cipher / decode animation
     3. Clients gallery — scroll-triggered stagger animation
   ============================================================ */


/* ============================================================
   1. FEATURED WORK LIST — HOVER OVERLAY INJECTION
   Section: 69a1ab39e4a48e5f71c38db3

   Injects an <a class="hover-overlay"> into each .list-item-media-inner
   containing the item's title and description. Also wraps the visible
   title text in a link and makes the whole media area clickable.

   CSS for the overlay lives in custom.css (section 4).
   ============================================================ */

(function () {
  function initListOverlays() {
    var section = document.querySelector('section[data-section-id="69a1ab39e4a48e5f71c38db3"]');
    if (!section) return;

    var items = section.querySelectorAll('.list-item');
    items.forEach(function (item) {
      if (item.querySelector('.hover-overlay')) return;

      var button    = item.querySelector('.list-item-content__button');
      var href      = button ? button.getAttribute('href') : '';
      var titleEl   = item.querySelector('.list-item-content__title');
      var titleText = titleEl ? titleEl.textContent.trim() : '';
      var descEl    = item.querySelector('.list-item-content__description');
      var descHTML  = descEl ? descEl.innerHTML : '';

      /* Build overlay */
      var overlay = document.createElement('a');
      overlay.className = 'hover-overlay';
      if (href) overlay.href = href;
      overlay.innerHTML = '<h2 class="overlay-title">' + titleText + '</h2>' + descHTML;

      var mediaInner = item.querySelector('.list-item-media-inner');
      if (mediaInner) mediaInner.appendChild(overlay);

      /* Wrap visible title in a link */
      if (titleEl && href && !titleEl.querySelector('a')) {
        var titleLink = document.createElement('a');
        titleLink.href = href;
        titleLink.innerHTML = titleEl.innerHTML;
        titleEl.innerHTML = '';
        titleEl.appendChild(titleLink);
      }

      /* Whole media region is clickable */
      var media = item.querySelector('.list-item-media');
      if (media && href) {
        media.addEventListener('click', function (e) {
          if (!e.target.closest('.hover-overlay')) {
            window.location.href = href;
          }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListOverlays);
  } else {
    initListOverlays();
  }

  /* Re-run after Squarespace's Mercury Ajax page transitions */
  window.addEventListener('mercury:load', initListOverlays);
})();


/* ============================================================
   2. CIPHER / DECODE ANIMATION — H1 HERO HEADING
   Block: #block-yui_3_17_2_1_1772202127116_2470

   On page load, scrambles the H1 text with random glyphs then
   resolves characters left-to-right with an ease-out curve:
   fast at the start, settling slowly at the end.

   Tuning:
     holdFrames    — frames of all-scrambled before resolve begins
     resolveFrames — frames over which chars resolve (ease-out)
     msPerFrame    — ms between animation ticks (~30fps)
     glyphs        — character pool for scramble (mixed case to
                     keep average width close to source text)
   ============================================================ */

(function () {
  if (document.body.classList.contains('sqs-is-page-editing')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function runCipher() {
    var block = document.querySelector('#block-yui_3_17_2_1_1772202127116_2470');
    if (!block || block.dataset.cipherDone) return;
    block.dataset.cipherDone = 'true';

    var h1 = block.querySelector('h1');
    if (!h1) return;

    /* Lock height so scrambled chars don't reflow the layout */
    var rect = h1.getBoundingClientRect();
    h1.style.height    = rect.height + 'px';
    h1.style.overflow  = 'hidden';
    h1.style.wordBreak = 'break-all';

    var glyphs = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV';

    /* Collect text nodes */
    var textNodes = [];
    (function walk(node) {
      if (node.nodeType === 3 && node.textContent.trim().length > 0) {
        textNodes.push({ node: node, original: node.textContent });
      } else {
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
      }
    })(h1);

    /* Build per-character state */
    var chars = [];
    textNodes.forEach(function (tn) {
      for (var i = 0; i < tn.original.length; i++) {
        chars.push({
          textNode: tn.node,
          index: i,
          target: tn.original[i],
          resolved: tn.original[i] === ' '
        });
      }
    });

    var holdFrames    = 30;
    var resolveFrames = 70;
    var totalFrames   = holdFrames + resolveFrames;

    /* Assign each char a frame at which it resolves (ease-out) */
    var nonSpace = chars.filter(function (c) { return !c.resolved; });
    nonSpace.forEach(function (c, i) {
      var t     = i / nonSpace.length;
      var eased = 1 - Math.pow(1 - t, 0.35);
      c.resolveAt = Math.floor(holdFrames + (eased * resolveFrames) + (Math.random() * 6 - 2));
    });

    /* Scramble all chars to start */
    textNodes.forEach(function (tn) {
      tn.node.textContent = tn.original.split('').map(function (c) {
        return c === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join('');
    });

    var frame = 0, lastTick = 0, msPerFrame = 33;

    function tick(timestamp) {
      if (!lastTick) lastTick = timestamp;
      if (timestamp - lastTick < msPerFrame) { requestAnimationFrame(tick); return; }
      lastTick = timestamp;
      frame++;

      var allDone     = true;
      var nodeBuffers = new Map();

      chars.forEach(function (c) {
        if (!nodeBuffers.has(c.textNode)) {
          nodeBuffers.set(c.textNode, new Array(c.textNode.textContent.length));
        }
        var buf = nodeBuffers.get(c.textNode);
        if (c.resolved || frame >= c.resolveAt) {
          c.resolved = true;
          buf[c.index] = c.target;
        } else {
          allDone = false;
          buf[c.index] = (Math.random() > 0.4)
            ? glyphs[Math.floor(Math.random() * glyphs.length)]
            : (c.textNode.textContent[c.index] || glyphs[0]);
        }
      });

      nodeBuffers.forEach(function (buf, node) { node.textContent = buf.join(''); });

      if (allDone || frame > totalFrames + 10) {
        /* Restore exact original text and unlock height */
        textNodes.forEach(function (tn) { tn.node.textContent = tn.original; });
        h1.style.height    = '';
        h1.style.overflow  = '';
        h1.style.wordBreak = '';
      } else {
        requestAnimationFrame(tick);
      }
    }

    /* 500ms pause before scramble begins (lets page settle) */
    setTimeout(function () { requestAnimationFrame(tick); }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runCipher);
  } else {
    runCipher();
  }
})();


/* ============================================================
   3. CLIENTS GALLERY — SCROLL-TRIGGERED STAGGER ANIMATION
   Section: 69a1f75a05bc7061b5e415c7

   Each client logo fades up individually as the section scrolls
   into view. Animation cascades left-to-right within each row,
   and row-by-row top-to-bottom.

   Overrides Squarespace's native preFade/fadeIn system with
   !important CSS so our transitions take full control.

   Tuning vars:
     DURATION_MS          — fade + lift transition length
     INTRA_ROW_STAGGER_MS — delay between logos in the same row
     ROW_STAGGER_MS       — extra delay between rows
     LIFT_PX              — how far logos rise on entry
     BOTTOM_MARGIN        — how far below viewport to pre-trigger
                            (higher % = triggers earlier / less blank)
     PER_ROW              — logos per row in the grid
   ============================================================ */

(function () {
  if (document.body.classList.contains('sqs-is-page-editing')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DURATION_MS          = 900;
  var INTRA_ROW_STAGGER_MS = 120;
  var ROW_STAGGER_MS       = 90;
  var LIFT_PX              = 50;
  var REVEAL_THRESHOLD     = 0;
  var BOTTOM_MARGIN        = '18%';
  var PER_ROW              = 4;

  /* Inject CSS with !important to defeat Squarespace's animation system */
  var css = document.createElement('style');
  css.textContent =
    'section[data-section-id="69a1f75a05bc7061b5e415c7"] .sqs-gallery-block-grid .slide {' +
      'opacity: 0 !important;' +
      'transform: translateY(' + LIFT_PX + 'px) !important;' +
      'transition: opacity ' + DURATION_MS + 'ms cubic-bezier(0.22,1,0.36,1),' +
        ' transform ' + DURATION_MS + 'ms cubic-bezier(0.22,1,0.36,1) !important;' +
      'animation: none !important;' +
      'will-change: opacity, transform;}' +
    'section[data-section-id="69a1f75a05bc7061b5e415c7"] .sqs-gallery-block-grid .slide.ic-in {' +
      'opacity: 1 !important;' +
      'transform: translateY(0) !important;}';
  document.head.appendChild(css);

  function init() {
    var section = document.querySelector('[data-section-id="69a1f75a05bc7061b5e415c7"]');
    if (!section) return;

    var slides = section.querySelectorAll('.sqs-gallery-block-grid .slide');
    if (!slides.length) return;

    /* Remove Squarespace's own animation classes before they fire */
    slides.forEach(function (slide) { slide.classList.remove('preFade', 'fadeIn'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var slide = entry.target;
        var index = parseInt(slide.dataset.icIdx, 10);
        var row   = Math.floor(index / PER_ROW);
        var col   = index % PER_ROW;
        var delay = (row * ROW_STAGGER_MS) + (col * INTRA_ROW_STAGGER_MS);

        setTimeout(function () { slide.classList.add('ic-in'); }, delay);
        io.unobserve(slide);
      });
    }, {
      threshold:  REVEAL_THRESHOLD,
      rootMargin: '0px 0px ' + BOTTOM_MARGIN + ' 0px'
    });

    slides.forEach(function (slide, i) {
      slide.dataset.icIdx = i;
      io.observe(slide);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
