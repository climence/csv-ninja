import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import JSZip from 'jszip';
import API_BASE_URL from './config';
import { 
  Upload, 
  Download, 
  Archive, 
  CheckCircle, 
  AlertCircle,
  Scissors,
  FileText
} from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [maxRowsPerFile, setMaxRowsPerFile] = useState(50);
  const [hasHeader, setHasHeader] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && (uploadedFile.type === 'text/csv' || uploadedFile.name.endsWith('.csv'))) {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Veuillez sélectionner un fichier CSV valide.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleSplit = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }

    if (!maxRowsPerFile || maxRowsPerFile < 1) {
      setError('Le nombre de lignes par fichier doit être supérieur à 0.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('maxRowsPerFile', maxRowsPerFile);
    formData.append('hasHeader', hasHeader);

    try {
      const response = await axios.post(`${API_BASE_URL}/split-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue lors du traitement du fichier.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFile = async (fileData) => {
    try {
      // Créer un blob à partir du contenu CSV
      const blob = new Blob([fileData.content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileData.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors du téléchargement du fichier.');
    }
  };

  const handleDownloadAll = async () => {
    if (!result?.files) return;

    try {
      // Créer le ZIP côté client
      const zip = new JSZip();
      
      // Ajouter chaque fichier au ZIP
      result.files.forEach(file => {
        zip.file(file.filename, file.content);
      });
      
      // Générer le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Télécharger le ZIP
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fichiers_decoupes.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors du téléchargement de l\'archive.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <img src="/logo-copromatic.png" alt="Copromatic Logo" className="header-logo" />
            <h1>CSV Ninja</h1>
            <p>Découpez vos fichiers CSV volumineux facilement</p>
          </div>
        </header>

        <div className="card">
          <h2>Configuration du découpage</h2>
          
          <div className="input-group">
            <label>Fichier CSV à découper</label>
            <div 
              {...getRootProps()} 
              className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={48} className="dropzone-icon" />
              {isDragActive ? (
                <p>Déposez le fichier ici...</p>
              ) : (
                <div>
                  <p><strong>Cliquez pour sélectionner</strong> ou glissez-déposez votre fichier CSV</p>
                  <p className="dropzone-hint">Formats acceptés: .csv (max 100MB)</p>
                </div>
              )}
            </div>
            
            {file && (
              <div className="file-info">
                <div className="file-info-header">
                  <FileText size={20} />
                  <span className="file-name">{file.name}</span>
                </div>
                <div className="file-details">
                  Taille: {formatFileSize(file.size)} | 
                  Type: {file.type || 'text/csv'}
                </div>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="maxRows">Nombre maximum de lignes par fichier</label>
            <input
              id="maxRows"
              type="number"
              value={maxRowsPerFile}
              onChange={(e) => setMaxRowsPerFile(parseInt(e.target.value) || 0)}
              min="1"
              placeholder="Ex: 5000"
            />
          </div>

          <div className="checkbox-group">
            <input
              id="hasHeader"
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            <label htmlFor="hasHeader">
              Le fichier contient un header (noms de colonnes)
            </label>
          </div>

          <button 
            className="btn btn-primary split-btn"
            onClick={handleSplit}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="spinner"></div>
                Traitement en cours...
              </>
            ) : (
              <>
                <Scissors size={20} />
                Découper le fichier
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <>
            <div className="success-message">
              <CheckCircle size={20} />
              <span>{result.message}</span>
            </div>

            <div className="stats">
              <div className="stat-card">
                <div className="stat-number">{result.files.length}</div>
                <div className="stat-label">Fichiers générés</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{result.totalRows.toLocaleString()}</div>
                <div className="stat-label">Lignes totales</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{result.maxRowsPerFile.toLocaleString()}</div>
                <div className="stat-label">Lignes max par fichier</div>
              </div>
            </div>

            <div className="card">
              <div className="download-header">
                <h2>Fichiers générés</h2>
                <button 
                  className="btn btn-success"
                  onClick={handleDownloadAll}
                >
                  <Archive size={20} />
                  Télécharger tout (ZIP)
                </button>
              </div>

              <div className="file-list">
                {result.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-item-info">
                      <div className="file-item-name">{file.filename}</div>
                      <div className="file-item-details">
                        {file.rows.toLocaleString()} lignes
                      </div>
                    </div>
                    <div className="file-item-actions">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download size={16} />
                        Télécharger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
