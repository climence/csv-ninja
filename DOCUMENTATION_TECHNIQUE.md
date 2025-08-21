# 📚 Documentation Technique - Splitter

## Architecture générale

### Stack technologique

**Backend :**
- **Runtime** : Node.js (v16+)
- **Framework** : Express.js
- **Traitement CSV** : csv-parser, csv-writer
- **Upload** : Multer
- **Archives** : Archiver
- **Sécurité** : Helmet, CORS, express-rate-limit

**Frontend :**
- **Framework** : React 18
- **Upload** : React Dropzone
- **HTTP Client** : Axios
- **Icons** : Lucide React
- **Build** : Create React App

## Structure du code

### Backend (`server.js`)

#### Configuration et middleware

```javascript
// Sécurité
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requêtes par IP
});
```

#### Configuration Multer

```javascript
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
```

#### Fonctions principales

**`analyzeCsvFile(filePath, hasHeader)`**
- Lit le fichier CSV en streaming
- Compte les lignes
- Extrait les headers si nécessaire
- Retourne : `{ totalRows, header, data }`

**`createCsvFile(data, headers, outputPath)`**
- Crée un fichier CSV avec les données fournies
- Utilise csv-writer pour la génération
- Retourne une Promise

**`cleanupFiles(files)`**
- Supprime les fichiers temporaires
- Utilisé après traitement et téléchargement

### Frontend (`client/src/App.js`)

#### État de l'application

```javascript
const [file, setFile] = useState(null);
const [maxRowsPerFile, setMaxRowsPerFile] = useState(5000);
const [hasHeader, setHasHeader] = useState(true);
const [isProcessing, setIsProcessing] = useState(false);
const [result, setResult] = useState(null);
const [error, setError] = useState(null);
```

#### Gestion des fichiers

**Upload avec React Dropzone :**
```javascript
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: { 'text/csv': ['.csv'] },
  multiple: false
});
```

**Traitement du découpage :**
```javascript
const handleSplit = async () => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('maxRowsPerFile', maxRowsPerFile);
  formData.append('hasHeader', hasHeader);
  
  const response = await axios.post('/api/split-csv', formData);
  setResult(response.data);
};
```

## API Endpoints

### POST `/api/split-csv`

**Fonction** : Découpe un fichier CSV

**Paramètres :**
- `file` : Fichier CSV (multipart/form-data)
- `maxRowsPerFile` : Nombre max de lignes par fichier
- `hasHeader` : Boolean (string 'true'/'false')

**Réponse succès :**
```json
{
  "success": true,
  "message": "Fichier découpé avec succès en 3 partie(s)",
  "files": [
    {
      "filename": "data_part1.csv",
      "path": "/path/to/file",
      "rows": 5000
    }
  ],
  "totalRows": 12345,
  "maxRowsPerFile": 5000
}
```

**Réponse erreur :**
```json
{
  "error": "Message d'erreur"
}
```

### GET `/api/download/:filename`

**Fonction** : Télécharge un fichier individuel

**Paramètres :**
- `filename` : Nom du fichier à télécharger

**Réponse** : Fichier binaire (attachment)

### POST `/api/download-all`

**Fonction** : Télécharge tous les fichiers en ZIP

**Body :**
```json
{
  "files": [
    { "filename": "file1.csv" },
    { "filename": "file2.csv" }
  ]
}
```

**Réponse** : Archive ZIP (attachment)

## Algorithmes de découpage

### Avec header

```javascript
// Exemple : 12 345 lignes, limite 5 000
const numberOfFiles = Math.ceil(totalDataRows / maxRows); // 3

for (let i = 0; i < numberOfFiles; i++) {
  const startIndex = i * maxRows;
  const endIndex = Math.min((i + 1) * maxRows, totalDataRows);
  const chunk = dataRows.slice(startIndex, endIndex);
  
  // Chaque fichier contient le header + les données
  await createCsvFile(chunk, header, outputPath);
}
```

**Résultat :**
- `file_part1.csv` : Header + 5 000 lignes
- `file_part2.csv` : Header + 5 000 lignes  
- `file_part3.csv` : Header + 2 344 lignes

### Sans header

Même logique mais sans ajout de header dans chaque fichier.

## Gestion des erreurs

### Validation des fichiers

```javascript
// Vérification du type
if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
  throw new Error('Seuls les fichiers CSV sont acceptés');
}

// Vérification de la taille
if (file.size > 100 * 1024 * 1024) { // 100MB
  throw new Error('Fichier trop volumineux');
}

// Vérification du contenu
if (hasHeader && analysis.totalRows < 2) {
  throw new Error('Le fichier doit contenir au minimum un header et une ligne de données');
}
```

### Gestion des erreurs côté client

```javascript
try {
  const response = await axios.post('/api/split-csv', formData);
  setResult(response.data);
} catch (err) {
  setError(err.response?.data?.error || 'Une erreur est survenue');
} finally {
  setIsProcessing(false);
}
```

## Sécurité

### Middleware de sécurité

```javascript
// Headers de sécurité
app.use(helmet());

// CORS
app.use(cors());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### Validation des uploads

```javascript
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
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});
```

### Nettoyage automatique

```javascript
// Après téléchargement
setTimeout(() => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}, 5000);
```

## Performance

### Optimisations

1. **Streaming** : Lecture des CSV en streaming pour éviter la surcharge mémoire
2. **Nettoyage automatique** : Suppression des fichiers temporaires
3. **Rate limiting** : Protection contre les abus
4. **Validation côté client** : Réduction des requêtes inutiles

### Limites

- **Taille fichier** : 100MB maximum
- **Rate limiting** : 100 requêtes/15min par IP
- **Mémoire** : Traitement en chunks pour éviter l'overflow

## Tests

### Tests manuels recommandés

1. **Fichier avec header**
   - Upload d'un CSV avec en-têtes
   - Vérification de la reproduction des headers
   - Test de téléchargement individuel et ZIP

2. **Fichier sans header**
   - Upload d'un CSV sans en-têtes
   - Vérification du découpage correct

3. **Fichiers volumineux**
   - Test avec des fichiers proches de 100MB
   - Vérification des performances

4. **Cas d'erreur**
   - Fichier non-CSV
   - Fichier vide
   - Fichier trop volumineux
   - Paramètres invalides

### Tests automatisés (à implémenter)

```javascript
// Exemple de test avec Jest
describe('CSV Splitter API', () => {
  test('should split CSV file correctly', async () => {
    const response = await request(app)
      .post('/api/split-csv')
      .attach('file', 'test.csv')
      .field('maxRowsPerFile', '1000')
      .field('hasHeader', 'true');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## Déploiement

### Variables d'environnement

```env
NODE_ENV=production
PORT=5000
```

### Scripts de build

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "cd client && npm run build",
    "heroku-postbuild": "npm run install-client && npm run build"
  }
}
```

### Déploiement Heroku

```bash
# Procfile
web: npm start

# Déploiement
heroku create
git push heroku main
```

## Maintenance

### Logs

```javascript
// Logs d'erreur
console.error('Erreur lors du traitement:', error);

// Logs de démarrage
console.log(`🚀 Serveur Splitter démarré sur le port ${PORT}`);
```

### Monitoring

- **Fichiers temporaires** : Vérification régulière du dossier `uploads/`
- **Espace disque** : Surveillance de l'espace disponible
- **Performance** : Monitoring des temps de réponse

### Mises à jour

1. **Dépendances** : `npm audit` et `npm update`
2. **Sécurité** : Mise à jour des packages de sécurité
3. **Fonctionnalités** : Ajout de nouvelles options de découpage

---

Cette documentation technique fournit toutes les informations nécessaires pour comprendre, maintenir et étendre l'application Splitter.
