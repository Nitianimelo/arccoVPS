export const iframeEditorScript = `
  const isTextNode = (node) => {
    return node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0;
  };

  const isEditableElement = (el) => {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    // Allow headings, paragraphs, spans, links, buttons, and images
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'img', 'div', 'li', 'strong', 'em'].includes(tag)) {
      // For divs and other containers, only edit if they directly contain text
      if (['div', 'li'].includes(tag)) {
        let hasDirectText = false;
        el.childNodes.forEach(node => {
          if (isTextNode(node)) hasDirectText = true;
        });
        return hasDirectText;
      }
      return true;
    }
    return false;
  };

  let hoveredElement = null;
  let selectedElement = null;

  // Setup styles for hover and selection outlines
  const style = document.createElement('style');
  style.textContent = '\\n' + 
    '    .arcco-hover-outline {\\n' +
    '      outline: 2px dashed #818cf8 !important;\\n' +
    '      outline-offset: 2px !important;\\n' +
    '      cursor: text !important;\\n' +
    '      transition: outline 0.1s ease !important;\\n' +
    '    }\\n' +
    '    img.arcco-hover-outline {\\n' +
    '      cursor: pointer !important;\\n' +
    '    }\\n' +
    '    .arcco-selected-outline {\\n' +
    '      outline: 2px solid #6366f1 !important;\\n' +
    '      outline-offset: 2px !important;\\n' +
    '      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2) !important;\\n' +
    '    }\\n';
  document.head.appendChild(style);

  // Generates a unique path selector for an element to locate it later
  const getElementPath = (el) => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() !== 'body') {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      path.unshift(current.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
      current = current.parentElement;
    }
    return path.join(' > ');
  };

  const selectElement = (el) => {
    if (selectedElement) {
      selectedElement.classList.remove('arcco-selected-outline');
    }
    selectedElement = el;
    if (selectedElement) {
      selectedElement.classList.add('arcco-selected-outline');
      
      const computedStyle = window.getComputedStyle(selectedElement);
      const isImage = selectedElement.tagName.toLowerCase() === 'img';
      
      // Get Tailwind text size class if possible, otherwise use computed
      const className = selectedElement.className || '';
      let textSizeClass = 'text-base';
      if (className.includes('text-sm')) textSizeClass = 'text-sm';
      if (className.includes('text-lg')) textSizeClass = 'text-lg';
      if (className.includes('text-xl')) textSizeClass = 'text-xl';
      if (className.includes('text-2xl')) textSizeClass = 'text-2xl';
      if (className.includes('text-4xl')) textSizeClass = 'text-4xl';
      if (className.includes('text-5xl')) textSizeClass = 'text-5xl';
      if (className.includes('text-7xl')) textSizeClass = 'text-7xl';

      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        payload: {
          path: getElementPath(selectedElement),
          tagName: selectedElement.tagName.toLowerCase(),
          isImage: isImage,
          content: isImage ? selectedElement.src : selectedElement.innerHTML,
          color: computedStyle.color,
          fontFamily: computedStyle.fontFamily,
          textSizeClass: textSizeClass,
        }
      }, '*');
    } else {
      window.parent.postMessage({ type: 'ELEMENT_DESELECTED' }, '*');
    }
  };

  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (isEditableElement(el)) {
      if (hoveredElement && hoveredElement !== el) {
        hoveredElement.classList.remove('arcco-hover-outline');
      }
      hoveredElement = el;
      hoveredElement.classList.add('arcco-hover-outline');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (hoveredElement) {
      hoveredElement.classList.remove('arcco-hover-outline');
      hoveredElement = null;
    }
  });

  document.addEventListener('click', (e) => {
    const el = e.target;
    if (isEditableElement(el)) {
      e.preventDefault();
      e.stopPropagation();
      selectElement(el);
    } else {
      selectElement(null); // Clicked outside editable areas
    }
  }, true);

  // Listen for updates from parent React app
  window.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    if (type === 'UPDATE_ELEMENT' && selectedElement) {
      
      if (payload.content !== undefined) {
        if (selectedElement.tagName.toLowerCase() === 'img') {
          selectedElement.src = payload.content;
        } else {
          selectedElement.innerHTML = payload.content;
        }
      }
      
      if (payload.color) {
        selectedElement.style.color = payload.color;
      }
      
      if (payload.fontFamily) {
        selectedElement.style.fontFamily = payload.fontFamily;
      }
      
      if (payload.textSizeClass) {
        // Remove old text sizes
        const sizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'];
        selectedElement.classList.remove(...sizes);
        selectedElement.classList.add(payload.textSizeClass);
      }
    } else if (type === 'DESELECT_ALL') {
      selectElement(null);
    }
  });
`;
