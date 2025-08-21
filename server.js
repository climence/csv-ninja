const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const archiver = require('archiver');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Configuration Multer pour le stockage temporaire
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptés'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Fonction pour nettoyer les fichiers temporaires
const cleanupFiles = (files) => {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
};

// Fonction pour lire le fichier CSV et compter les lignes
const analyzeCsvFile = (filePath, hasHeader) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let lineCount = 0;
    let header = null;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (lineCount === 0 && hasHeader) {
          header = Object.keys(data);
        }
        results.push(data);
        lineCount++;
      })
      .on('end', () => {
        resolve({
          totalRows: lineCount,
          header: header,
          data: results
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Fonction pour créer un fichier CSV
const createCsvFile = (data, headers, outputPath) => {
  return new Promise((resolve, reject) => {
    const csvWriter = createCsvWriter({
      path: outputPath,
      header: headers.map(header => ({ id: header, title: header }))
    });

    csvWriter.writeRecords(data)
      .then(() => resolve())
      .catch(reject);
  });
};

// Route principale pour le découpage CSV
app.post('/api/split-csv', upload.single('file'), async (req, res) => {
  const uploadedFile = req.file;
  const { maxRowsPerFile, hasHeader } = req.body;

  if (!uploadedFile) {
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }

  if (!maxRowsPerFile || maxRowsPerFile < 1) {
    cleanupFiles([uploadedFile.path]);
    return res.status(400).json({ error: 'Le nombre de lignes par fichier doit être supérieur à 0' });
  }

  try {
    // Analyser le fichier
    const analysis = await analyzeCsvFile(uploadedFile.path, hasHeader === 'true');
    
    // Vérifications
    if (hasHeader === 'true' && analysis.totalRows < 2) {
      cleanupFiles([uploadedFile.path]);
      return res.status(400).json({ 
        error: 'Le fichier doit contenir au minimum un header et une ligne de données' 
      });
    }

    if (hasHeader === 'false' && analysis.totalRows < 1) {
      cleanupFiles([uploadedFile.path]);
      return res.status(400).json({ 
        error: 'Le fichier doit contenir au minimum une ligne de données' 
      });
    }

    const maxRows = parseInt(maxRowsPerFile);
    const dataRows = hasHeader === 'true' ? analysis.data : analysis.data;
    const totalDataRows = dataRows.length;
    
    // Calculer le nombre de fichiers nécessaires
    const numberOfFiles = Math.ceil(totalDataRows / maxRows);
    
    // Créer les fichiers découpés
    const outputDir = path.join(__dirname, 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseFileName = path.parse(uploadedFile.originalname).name;
    const generatedFiles = [];

    for (let i = 0; i < numberOfFiles; i++) {
      const startIndex = i * maxRows;
      const endIndex = Math.min((i + 1) * maxRows, totalDataRows);
      const chunk = dataRows.slice(startIndex, endIndex);
      
      const outputFileName = `${baseFileName}_part${i + 1}.csv`;
      const outputPath = path.join(outputDir, outputFileName);
      
      await createCsvFile(chunk, analysis.header || Object.keys(chunk[0] || {}), outputPath);
      generatedFiles.push({
        filename: outputFileName,
        path: outputPath,
        rows: chunk.length
      });
    }

    // Nettoyer le fichier uploadé
    cleanupFiles([uploadedFile.path]);

    res.json({
      success: true,
      message: `Fichier découpé avec succès en ${numberOfFiles} partie(s)`,
      files: generatedFiles,
      totalRows: totalDataRows,
      maxRowsPerFile: maxRows
    });

  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    cleanupFiles([uploadedFile.path]);
    res.status(500).json({ 
      error: 'Erreur lors du traitement du fichier CSV',
      details: error.message 
    });
  }
});

// Route pour télécharger un fichier individuel
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'outputs', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Erreur lors du téléchargement:', err);
    }
    // Nettoyer le fichier après téléchargement
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  });
});

// Route pour télécharger tous les fichiers en ZIP
app.post('/api/download-all', async (req, res) => {
  const { files } = req.body;
  
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Liste de fichiers invalide' });
  }

  const archive = archiver('zip', {
    zlib: { level: 9 } // Compression maximale
  });

  res.attachment('fichiers_decoupes.zip');
  archive.pipe(res);

  const filesToCleanup = [];

  for (const file of files) {
    const filePath = path.join(__dirname, 'outputs', file.filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.filename });
      filesToCleanup.push(filePath);
    }
  }

  await archive.finalize();

  // Nettoyer les fichiers après un délai
  setTimeout(() => {
    filesToCleanup.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }, 10000);
});

// Route pour servir l'application React en production
if (process.env.NODE_ENV === 'production') {
  // Servir les fichiers statiques du build React
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  // Route pour servir index.html pour toutes les routes non-API
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Export pour Vercel
module.exports = app;

// Gestion des erreurs globales
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// Démarrage du serveur seulement si pas sur Vercel
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur CSV Ninja démarré sur le port ${PORT}`);
    console.log(`📁 Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}
