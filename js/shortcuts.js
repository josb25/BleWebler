// Keyboard Shortcuts System
// Easy to add new shortcuts - just add them to the shortcuts array below

const shortcuts = [
  {
    keys: ['r', 'ArrowLeft'],
    description: 'Rotate selected object left',
    handler: () => rotateObject(-15)
  },
  {
    keys: ['r', 'ArrowRight'],
    description: 'Rotate selected object right',
    handler: () => rotateObject(15)
  },
  {
    keys: ['Delete'],
    description: 'Delete selected object',
    handler: () => deleteSelectedObject()
  },
  {
    keys: ['Backspace'],
    description: 'Delete selected object',
    handler: () => deleteSelectedObject()
  },
  {
    keys: ['Escape'],
    description: 'Deselect object',
    handler: () => deselectObject()
  },
  {
    keys: ['ArrowLeft'],
    description: 'Move selected object left',
    handler: () => moveObject(-5, 0)
  },
  {
    keys: ['ArrowRight'],
    description: 'Move selected object right',
    handler: () => moveObject(5, 0)
  },
  {
    keys: ['ArrowUp'],
    description: 'Move selected object up',
    handler: () => moveObject(0, -5)
  },
  {
    keys: ['ArrowDown'],
    description: 'Move selected object down',
    handler: () => moveObject(0, 5)
  },
  {
    keys: ['Shift', 'ArrowLeft'],
    description: 'Move selected object left (fine)',
    handler: () => moveObject(-1, 0)
  },
  {
    keys: ['Shift', 'ArrowRight'],
    description: 'Move selected object right (fine)',
    handler: () => moveObject(1, 0)
  },
  {
    keys: ['Shift', 'ArrowUp'],
    description: 'Move selected object up (fine)',
    handler: () => moveObject(0, -1)
  },
  {
    keys: ['Shift', 'ArrowDown'],
    description: 'Move selected object down (fine)',
    handler: () => moveObject(0, 1)
  }
];

// State for tracking key combinations
let pressedKeys = new Set();

// Helper functions for shortcuts
function rotateObject(angle) {
  const canvas = window.getFabricCanvas();
  if (!canvas) return;
  
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    const currentAngle = activeObject.angle || 0;
    activeObject.set('angle', currentAngle + angle);
    canvas.renderAll();
  }
}

function moveObject(dx, dy) {
  const canvas = window.getFabricCanvas();
  if (!canvas) return;
  
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    const currentLeft = activeObject.left || 0;
    const currentTop = activeObject.top || 0;
    activeObject.set({
      left: currentLeft + dx,
      top: currentTop + dy
    });
    canvas.renderAll();
  }
}

function deselectObject() {
  const canvas = window.getFabricCanvas();
  if (!canvas) return;
  
  canvas.discardActiveObject();
  canvas.renderAll();
}

// Initialize shortcuts system
document.addEventListener('DOMContentLoaded', () => {
  // Set up keyboard event listeners
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    // Normalize key for storage
    const normalizedKey = normalizeKeyForStorage(e.key);
    pressedKeys.add(normalizedKey);
    
    // Also add modifier keys if present
    if (e.shiftKey) pressedKeys.add('Shift');
    if (e.ctrlKey) pressedKeys.add('Control');
    if (e.altKey) pressedKeys.add('Alt');
    if (e.metaKey) pressedKeys.add('Meta');

    // Check all shortcuts
    shortcuts.forEach(shortcut => {
      if (matchesShortcut(shortcut.keys, pressedKeys)) {
        e.preventDefault();
        shortcut.handler();
      }
    });
  });

  document.addEventListener('keyup', (e) => {
    const normalizedKey = normalizeKeyForStorage(e.key);
    pressedKeys.delete(normalizedKey);
    
    // Remove modifier keys
    if (!e.shiftKey) pressedKeys.delete('Shift');
    if (!e.ctrlKey) pressedKeys.delete('Control');
    if (!e.altKey) pressedKeys.delete('Alt');
    if (!e.metaKey) pressedKeys.delete('Meta');
  });

  // Populate shortcuts modal
  const shortcutsList = document.getElementById('shortcutsList');
  if (shortcutsList) {
    shortcuts.forEach(shortcut => {
      const item = document.createElement('div');
      item.className = 'shortcut-item';
      
      const description = document.createElement('span');
      description.className = 'shortcut-description';
      description.textContent = shortcut.description;
      
      const keys = document.createElement('div');
      keys.className = 'shortcut-keys';
      
      shortcut.keys.forEach(key => {
        const keySpan = document.createElement('span');
        keySpan.className = 'shortcut-key';
        keySpan.textContent = formatKey(key);
        keys.appendChild(keySpan);
      });
      
      item.appendChild(description);
      item.appendChild(keys);
      shortcutsList.appendChild(item);
    });
  }

  // Shortcuts modal toggle
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsModal = document.getElementById('closeShortcutsModal');

  if (shortcutsBtn && shortcutsModal) {
    shortcutsBtn.addEventListener('click', () => {
      shortcutsModal.classList.add('show');
    });
  }

  if (closeShortcutsModal && shortcutsModal) {
    closeShortcutsModal.addEventListener('click', () => {
      shortcutsModal.classList.remove('show');
    });
  }

  // Close modal when clicking outside
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.classList.remove('show');
      }
    });
  }
});

// Normalize key for storage (handles case-insensitive keys like 'r'/'R')
function normalizeKeyForStorage(key) {
  // For letter keys, always store lowercase
  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    return key.toLowerCase();
  }
  return key;
}

// Helper function to check if pressed keys match a shortcut
function matchesShortcut(shortcutKeys, pressedKeysSet) {
  // Check if all required keys are pressed
  for (const key of shortcutKeys) {
    const normalizedKey = normalizeKeyForComparison(key);
    
    // For letter keys, check both cases
    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      if (!pressedKeysSet.has(key.toLowerCase()) && !pressedKeysSet.has(key.toUpperCase())) {
        return false;
      }
    } else {
      // For special keys, check normalized and original
      if (!pressedKeysSet.has(normalizedKey) && !pressedKeysSet.has(key)) {
        return false;
      }
    }
  }
  
  return true;
}

// Normalize key names for comparison
function normalizeKeyForComparison(key) {
  const keyMap = {
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'Delete': 'Delete',
    'Backspace': 'Backspace',
    'Escape': 'Escape',
    'Shift': 'Shift',
    'Control': 'Control',
    'Alt': 'Alt',
    'Meta': 'Meta'
  };
  
  return keyMap[key] || key.toLowerCase();
}

// Format key for display
function formatKey(key) {
  const keyMap = {
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Delete': 'Del',
    'Backspace': 'Backspace',
    'Escape': 'Esc',
    'Shift': 'Shift',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': 'Cmd'
  };
  
  return keyMap[key] || key.toUpperCase();
}

// Export function to add shortcuts programmatically
window.addShortcut = function(keys, description, handler) {
  shortcuts.push({ keys, description, handler });
  
  // Re-render shortcuts list if modal exists
  const shortcutsList = document.getElementById('shortcutsList');
  if (shortcutsList) {
    shortcutsList.innerHTML = '';
    shortcuts.forEach(shortcut => {
      const item = document.createElement('div');
      item.className = 'shortcut-item';
      
      const desc = document.createElement('span');
      desc.className = 'shortcut-description';
      desc.textContent = shortcut.description;
      
      const keysDiv = document.createElement('div');
      keysDiv.className = 'shortcut-keys';
      
      shortcut.keys.forEach(key => {
        const keySpan = document.createElement('span');
        keySpan.className = 'shortcut-key';
        keySpan.textContent = formatKey(key);
        keysDiv.appendChild(keySpan);
      });
      
      item.appendChild(desc);
      item.appendChild(keysDiv);
      shortcutsList.appendChild(item);
    });
  }
};

