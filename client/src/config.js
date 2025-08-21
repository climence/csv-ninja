// Configuration des URLs d'API selon l'environnement
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'
  : 'http://localhost:5002/api';

export default API_BASE_URL;
