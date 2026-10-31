import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--port' && process.argv[i + 1]) {
      const p = parseInt(process.argv[i + 1], 10);
      if (!isNaN(p) && p > 0) return p;
    }
    if (arg.startsWith('--port=')) {
      const p = parseInt(arg.split('=')[1], 10);
      if (!isNaN(p) && p > 0) return p;
    }
  }
  // In development, dev server MUST listen on port 3000 as required by the environment
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

function getHost(): string {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--host' && process.argv[i + 1]) {
      return process.argv[i + 1];
    }
    if (arg.startsWith('--host=')) {
      return arg.split('=')[1];
    }
  }
  return '0.0.0.0';
}

async function startServer() {
  const app = express();
  const PORT = getPort();
  const HOST = getHost();

  // Middleware for JSON body handling up to 50MB (to comfortably hold project APUs and data)
  app.use(express.json({ limit: '50mb' }));

  const DATA_DIR = path.resolve(__dirname, 'data');
  const PROJECTS_FILE = path.join(DATA_DIR, 'projects_persistent.json');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // API Route: Get persistent projects data (never cache)
  app.get('/api/projects', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
      if (fs.existsSync(PROJECTS_FILE)) {
        const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return res.json({ success: true, ...parsed });
      }
      return res.json({ success: true, projects: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error reading projects_persistent.json:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // API Route: Save persistent projects data permanently to disk
  app.post('/api/projects', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const { projects, activeProjectId } = req.body;
      if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json({ success: false, error: 'Expected non-empty projects array' });
      }

      const nowIso = new Date().toISOString();
      const payload = {
        projects,
        activeProjectId: activeProjectId || 'pdvsa-toreno-364',
        lastSaved: nowIso,
        system: 'PDVSA Costos & APU Petrolero - Persistencia Permanente en Disco',
      };

      const tempFile = `${PROJECTS_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tempFile, PROJECTS_FILE);

      return res.json({ success: true, lastSaved: payload.lastSaved });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error saving projects_persistent.json:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: List available files in public/ and public/assets/aistudio/ for quick sync
  app.get('/api/available-files', (_req, res) => {
    try {
      const publicDir = path.resolve(__dirname, 'public');
      const assetsDir = path.resolve(publicDir, 'assets/aistudio');
      const files: Array<{
        name: string;
        path: string;
        size: number;
        type: 'excel' | 'pdf';
        category: 'presupuesto' | 'lulowin' | 'especificaciones' | 'computos' | 'otro';
      }> = [];

      const scanDir = (dir: string, baseRelative: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.xlsx' || ext === '.xls' || ext === '.pdf') {
              const fullPath = path.join(dir, entry.name);
              const stat = fs.statSync(fullPath);
              const relPath = path.join(baseRelative, entry.name);
              const lowerName = entry.name.toLowerCase();

              let category: 'presupuesto' | 'lulowin' | 'especificaciones' | 'computos' | 'otro' = 'otro';
              if (lowerName.includes('especif') || lowerName.includes('ludert')) {
                category = 'especificaciones';
              } else if (lowerName.includes('computo') || lowerName.includes('medicion') || lowerName.includes('planilla')) {
                category = 'computos';
              } else if (lowerName.includes('presupuesto') || lowerName.includes('vela')) {
                category = 'presupuesto';
              } else if (lowerName.includes('lulo') || lowerName.includes('insumo')) {
                category = 'lulowin';
              }

              files.push({
                name: entry.name,
                path: relPath,
                size: stat.size,
                type: ext === '.pdf' ? 'pdf' : 'excel',
                category,
              });
            }
          }
        }
      };

      scanDir(publicDir, 'public');
      scanDir(assetsDir, 'public/assets/aistudio');

      // Remove duplicate paths if any
      const uniqueFiles = Array.from(new Map(files.map((f) => [f.path, f])).values());
      return res.json({ success: true, files: uniqueFiles });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error listing available files:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // API Route: Parse PDF from base64 upload or server relative path
  app.post('/api/parse-pdf', async (req, res) => {
    try {
      const { base64, relativePath } = req.body;
      let buffer: Buffer;

      if (relativePath) {
        const fullPath = path.resolve(__dirname, relativePath);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ success: false, error: `File not found: ${relativePath}` });
        }
        buffer = fs.readFileSync(fullPath);
      } else if (base64) {
        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else {
        return res.status(400).json({ success: false, error: 'Provide either base64 or relativePath' });
      }

      const parser = new PDFParse(new Uint8Array(buffer));
      const textResult = await parser.getText();
      const extractedText = typeof textResult === 'string' ? textResult : (textResult?.text || '');

      return res.json({
        success: true,
        text: extractedText,
        pages: textResult?.total || 1,
        charCount: extractedText.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing PDF';
      console.error('Error parsing PDF:', msg);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // API Route: Read an Excel file from public/ on the server and return base64
  app.post('/api/read-server-excel', (req, res) => {
    try {
      const { relativePath } = req.body;
      if (!relativePath) {
        return res.status(400).json({ success: false, error: 'relativePath is required' });
      }
      const fullPath = path.resolve(__dirname, relativePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: `File not found: ${relativePath}` });
      }

      const buffer = fs.readFileSync(fullPath);
      const base64 = buffer.toString('base64');
      return res.json({
        success: true,
        base64,
        filename: path.basename(fullPath),
        size: buffer.length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reading server excel file';
      return res.status(500).json({ success: false, error: msg });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middlewares in development (disable standalone HMR websocket to prevent port conflicts)
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`PDVSA Applet Server running at http://${HOST}:${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`Server failed on ${HOST}:${PORT}:`, err.message);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
