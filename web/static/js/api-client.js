/**
 * Clase principal para manejar la API del sistema
 */
class APIClient {
    constructor(baseURL = null) {
        this.baseURL = baseURL || this.getDefaultBaseURL();
        this.currentUser = this.getCurrentUser();
    }

    getDefaultBaseURL() {
        const { hostname, port, protocol } = window.location;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:5010`;
        }
        
        return window.location.origin;
    }

    /**
     * Realizar petición HTTP genérica
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Petición GET
     */
    async get(endpoint, params = {}) {
        const queryString = Object.keys(params).length > 0 
            ? '?' + new URLSearchParams(params).toString() 
            : '';
        
        return this.makeRequest(endpoint + queryString, {
            method: 'GET'
        });
    }

    /**
     * Petición POST con FormData
     */
    async postForm(endpoint, formData) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Dejar que el browser establezca Content-Type para FormData
        });
    }

    /**
     * Petición POST con JSON
     */
    async postJSON(endpoint, data) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Petición PUT con FormData
     */
    async putForm(endpoint, formData) {
        return this.makeRequest(endpoint, {
            method: 'PUT',
            body: formData,
            headers: {} // Dejar que el browser establezca Content-Type para FormData
        });
    }

    /**
     * Upload de archivos
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return this.postForm(endpoint, formData);
    }

    // === MÉTODOS DE USUARIO ===
    
    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const result = await this.postForm('/user/login', formData);
        // Store username in localStorage
        localStorage.setItem('currentUser', result.username);
        this.currentUser = result.username;
        return result;
    }

    async register(userData) {
        const formData = new FormData();
        Object.entries(userData).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        return this.postForm('/user/register', formData);
    }

    logout() {
        this.removeCurrentUser();
        window.location.href = '/login';
    }

    async getUserInfo(username) {
        const formData = new FormData();
        formData.append('username', username);
        
        return this.postForm('/user/get-user', formData);
    }

    async getResearch(username, researchId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        
        return this.postForm('/research/get-research', formData);
    }

    async updateUser(username, userData) {
        const formData = new FormData();
        formData.append('username', username);
        
        // Add only the fields that are being updated
        Object.entries(userData).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                formData.append(key, value);
            }
        });
        
        return this.putForm('/user/update', formData);
    }

    async updatePassword(username, currentPassword, newPassword) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        
        return this.putForm('/user/update-password', formData);
    }

    // === MÉTODOS DE INVESTIGACIÓN ===

    async getResearch(username, researchId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        
        return this.postForm('/research/get-research', formData);
    }
    
    async getResearchByOwner(username) {
        return this.get(`/research/get-by-owner/${username}`);
    }

    async createResearch(researchData) {
        const formData = new FormData();
        Object.entries(researchData).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        return this.postForm('/research/create', formData);
    }

    async saveResearch(researchData) {
        const formData = new URLSearchParams();
        formData.append('username', this.currentUser);
        formData.append('title', researchData.title);
        formData.append('type_research', researchData.type_research);
        formData.append('methodology', researchData.methodology);
        formData.append('criteria_inclusion', researchData.criteria_inclusion);
        formData.append('is_test', researchData.is_test);

        return this.makeRequest('/research/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
    }

    // === MÉTODOS DE LOADER ===

    async listDatasets(researchId) {
        const formData = new FormData();
        formData.append('research_id', researchId);
        
        return this.postForm('/data/list-datasets', formData);
    }

    async uploadDataset(researchId, file) {
        const formData = new FormData();
        formData.append('username', this.currentUser);
        formData.append('research_id', researchId);
        formData.append('file', file);
        
        return this.postForm('/data/load-data', formData);
    }

    // === MÉTODOS DE PIPELINE ===

    async createVectorStore(username, researchId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        
        return this.postForm('/retriever/create', formData);
    }

    async queryRetriever(username, researchId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        
        return this.postForm('/retriever/query', formData);
    }

    async labelArticle(username, researchId, articleId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        formData.append('article_id', articleId);
        
        return this.postForm('/labeler/process', formData);
    }

    async getLabelingSummary(researchId) {
        return this.get('/labeler/summary', { research_id: researchId });
    }

    async getLabeledResults(researchId) {
        return this.get('/labeler/results', { research_id: researchId });
    }

    async updatePrediction(username, articleId, prediction) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('article_id', articleId);
        formData.append('prediction', prediction);
        
        return this.putForm('/labeler/update-prediction', formData);
    }

    async trainMLModel(username, researchId, trainingData) {
        // Convert training data to CSV format
        const csvContent = this.convertToCSV(trainingData);
        
        // Create a Blob from CSV content
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], 'labeled_data.csv', { type: 'text/csv' });
        
        // Create FormData
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        formData.append('file', file);
        
        return this.postForm('/classifier/train', formData);
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        // Get headers
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma or newline
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
                    ? `"${escaped}"` 
                    : escaped;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    async updateResearchStep(researchId, step) {
        const formData = new FormData();
        formData.append('username', this.currentUser);
        formData.append('research_id', researchId);
        formData.append('step', step);
        
        return this.postForm('/research/update-step', formData);
    }

    // === MÉTODOS DE DATOS ===
    
    async uploadData(username, researchId, file) {
        return this.uploadFile('/data/load-data', file, {
            username,
            research_id: researchId
        });
    }

    // === MÉTODOS DE ETIQUETADO ===
    
    async processLabeling(username, researchId, articleId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('research_id', researchId);
        formData.append('article_id', articleId);
        
        return this.postForm('/labeler/process', formData);
    }

    async getLabelingSummary(researchId) {
        return this.get('/labeler/summary', { research_id: researchId });
    }

    async reprocessLabeling(researchId, method) {
        const formData = new FormData();
        formData.append('research_id', researchId);
        formData.append('method', method);
        
        return this.postForm('/labeler/reprocess', formData);
    }

    // === MÉTODOS DE MODELOS ===
    
    async trainModel(username, researchId, file) {
        return this.uploadFile('/classifier/train', file, {
            username,
            research_id: researchId
        });
    }

    async getTrainedModel(modelId) {
        return this.get(`/classifier/trained_model/${modelId}`);
    }

    async executeInference(username, modelId, articleId) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('model_id', modelId);
        formData.append('article_id', articleId);
        
        return this.postForm('/classifier/execute_inference', formData);
    }

    /**
     * Obtener modelos ML entrenados por investigación
     */
    async getTrainedModels(researchId) {
        return this.get(`/classifier/trained_models/${researchId}`);
    }

    /**
     * Obtener detalles de un modelo ML específico
     */
    async getModelDetails(modelId) {
        return this.get(`/classifier/trained_model/${modelId}`);
    }

    /**
     * Obtener todos los artículos de una investigación (de todos sus datasets)
     */
    async getAllArticlesByResearch(researchId) {
        const formData = new URLSearchParams();
        formData.append('research_id', researchId);
        
        return this.makeRequest('/data/get-articles-by-research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
    }

    /**
     * Ejecutar inferencia individual con un modelo ML
     */
    async executeInference(username, modelId, articleId) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('model_id', modelId);
        formData.append('article_id', articleId);
        
        return this.makeRequest('/classifier/execute_inference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
    }

    /**
     * Ejecutar inferencia sobre texto libre
     */
    async executeTextInference(username, modelId, abstractText) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('model_id', modelId);
        formData.append('abstract_text', abstractText);
        
        return this.makeRequest('/classifier/inference_text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
    }

    /**
     * Ejecutar inferencia masiva con un modelo ML
     */
    async executeBatchInference(username, modelId, articleIds) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('model_id', modelId);
        formData.append('article_ids', articleIds.join(','));
        
        return this.makeRequest('/classifier/batch_inference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
    }

    /**
     * Obtener resultados de predicciones ML por investigación
     */
    async getMLPredictions(researchId) {
        return this.get(`/classifier/predictions/${researchId}`);
    }

    /**
     * Descargar resultados de AI Labeler como CSV
     */
    async downloadAILabelerCSV(researchId) {
        const response = await fetch(`${this.baseURL}/labeler/download/${researchId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al descargar el archivo');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_labeler_${researchId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * Descargar resultados de ML Classifier como CSV
     */
    async downloadMLClassifierCSV(researchId) {
        const response = await fetch(`${this.baseURL}/classifier/download/${researchId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al descargar el archivo');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ml_predictions_${researchId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // === GESTIÓN DE SESIÓN ===
    
    getCurrentUser() {
        const username = localStorage.getItem('currentUser');
        return username;
    }

    setCurrentUser(username) {
        localStorage.setItem('currentUser', username);
        this.currentUser = username;
    }

    removeCurrentUser() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    requireAuthentication() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login';
            throw new Error('Authentication required');
        }
        return this.getCurrentUser();
    }
}

// Crear instancia global
window.apiClient = new APIClient();