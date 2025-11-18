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

    // === MÉTODOS DE INVESTIGACIÓN ===
    
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