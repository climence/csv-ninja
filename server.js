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

// Configuration pour Vercel (proxy trust)
app.set('trust proxy', 1);

// Middleware de logging pour déboguer
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://csv-ninja.vercel.app', 'https://csv-ninja-git-main-climence.vercel.app']
    : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Configuration Multer pour le stockage temporaire (compatible Vercel)
const storage = multer.memoryStorage(); // Utiliser la mémoire au lieu du disque

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
    fileSize: 10 * 1024 * 1024 // 10MB max pour Vercel
  }
});

// Fonction pour lire le fichier CSV et compter les lignes (version mémoire)
const analyzeCsvFile = (fileBuffer, hasHeader) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let lineCount = 0;
    let header = null;

    // Créer un stream à partir du buffer
    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(fileBuffer);
    readable.push(null);

    readable
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

// Fonction pour créer un fichier CSV (version mémoire)
const createCsvFile = (data, headers) => {
  return new Promise((resolve, reject) => {
    try {
      const csvWriter = createCsvWriter({
        path: 'temp.csv', // Chemin temporaire
        header: headers.map(header => ({ id: header, title: header }))
      });

      csvWriter.writeRecords(data)
        .then(() => {
          // Lire le fichier temporaire et le supprimer
          const csvContent = fs.readFileSync('temp.csv', 'utf8');
          fs.unlinkSync('temp.csv');
          resolve(csvContent);
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Route principale pour le découpage CSV
app.post('/api/split-csv', upload.single('file'), async (req, res) => {
  console.log('Début du traitement CSV');
  const uploadedFile = req.file;
  const { maxRowsPerFile, hasHeader } = req.body;

  console.log('Fichier reçu:', uploadedFile?.originalname);
  console.log('Paramètres:', { maxRowsPerFile, hasHeader });

  if (!uploadedFile) {
    console.log('Erreur: Aucun fichier fourni');
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }

  if (!maxRowsPerFile || maxRowsPerFile < 1) {
    console.log('Erreur: Nombre de lignes invalide');
    return res.status(400).json({ error: 'Le nombre de lignes par fichier doit être supérieur à 0' });
  }

  try {
    console.log('Début de l\'analyse du fichier');
    // Analyser le fichier
    const analysis = await analyzeCsvFile(uploadedFile.buffer, hasHeader === 'true');
    console.log('Analyse terminée:', { totalRows: analysis.totalRows, hasHeader: analysis.header });
    
    // Vérifications
    if (hasHeader === 'true' && analysis.totalRows < 2) {
      console.log('Erreur: Fichier trop petit avec header');
      return res.status(400).json({ 
        error: 'Le fichier doit contenir au minimum un header et une ligne de données' 
      });
    }

    if (hasHeader === 'false' && analysis.totalRows < 1) {
      console.log('Erreur: Fichier trop petit sans header');
      return res.status(400).json({ 
        error: 'Le fichier doit contenir au minimum une ligne de données' 
      });
    }

    const maxRows = parseInt(maxRowsPerFile);
    const dataRows = hasHeader === 'true' ? analysis.data : analysis.data;
    const totalDataRows = dataRows.length;
    
    console.log('Début du découpage:', { totalDataRows, maxRows });
    
    // Calculer le nombre de fichiers nécessaires
    const numberOfFiles = Math.ceil(totalDataRows / maxRows);
    
    const baseFileName = path.parse(uploadedFile.originalname).name;
    const generatedFiles = [];

    for (let i = 0; i < numberOfFiles; i++) {
      const startIndex = i * maxRows;
      const endIndex = Math.min((i + 1) * maxRows, totalDataRows);
      const chunk = dataRows.slice(startIndex, endIndex);
      
      const outputFileName = `${baseFileName}_part${i + 1}.csv`;
      
      console.log(`Création du fichier ${i + 1}/${numberOfFiles}:`, outputFileName);
      const csvContent = await createCsvFile(chunk, analysis.header || Object.keys(chunk[0] || {}));
      
      generatedFiles.push({
        filename: outputFileName,
        content: csvContent,
        rows: chunk.length
      });
    }

    console.log('Découpage terminé');
    console.log('Réponse envoyée avec succès');
    res.json({
      success: true,
      message: `Fichier découpé avec succès en ${numberOfFiles} partie(s)`,
      files: generatedFiles,
      totalRows: totalDataRows,
      maxRowsPerFile: maxRows
    });

  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Erreur lors du traitement du fichier CSV',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour servir l'application React en production
if (process.env.NODE_ENV === 'production') {
  // Construire le client React si nécessaire
  const clientBuildPath = path.join(__dirname, 'client/build');
  
  // Vérifier si le build existe, sinon le créer
  if (!fs.existsSync(clientBuildPath)) {
    console.log('Build React non trouvé, construction en cours...');
    const { execSync } = require('child_process');
    try {
      execSync('cd client && npm install && npm run build', { stdio: 'inherit' });
      console.log('Build React terminé');
    } catch (error) {
      console.error('Erreur lors du build React:', error);
    }
  }
  
  // Servir les fichiers statiques du build React
  app.use(express.static(clientBuildPath));
  
  // Route pour servir index.html pour toutes les routes non-API
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
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
