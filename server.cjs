const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const PROJECT_DIR = __dirname;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const serveFile = (res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Arquivo não encontrado</h1>');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve preview-completo.html by default
  if (req.url === '/' || req.url === '') {
    const previewPath = path.join(PROJECT_DIR, 'preview-completo.html');
    serveFile(res, previewPath);
    return;
  }

  // Try to serve other files
  const filePath = path.join(PROJECT_DIR, req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Serve default preview if file not found
      const previewPath = path.join(PROJECT_DIR, 'preview-completo.html');
      serveFile(res, previewPath);
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 ARCCO PREVIEW SERVER');
  console.log('='.repeat(50));
  console.log(`📡 Acesse em: http://localhost:${PORT}`);
  console.log(`📄 Servindo de: ${PROJECT_DIR}`);
  console.log('');
  console.log('Arquivos disponíveis:');
  console.log('  / → preview-completo.html (padrão)');
  console.log('  /arcco-chat.html → Arcco Chat');
  console.log('  /arcco-clean-preview.html → Arcco Pages Clean');
  console.log('  /arcco-pages-clean-preview.html → Arcco Pages (Design Moderno)');
  console.log('');
  console.log('Pressione Ctrl+C para encerrar');
  console.log('='.repeat(50));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Servidor encerrado');
  process.exit(0);
});
