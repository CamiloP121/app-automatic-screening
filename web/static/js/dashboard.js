/**
 * Dashboard Management
 */

class Dashboard {
    constructor() {
        this.apiClient = new APIClient();
        this.currentResearches = [];
        this.currentView = 'list'; // 'list' or 'detail'
        this.selectedResearch = null;
        this.currentUser = null;
        this.userInfo = null;
        this.init();
    }

    init() {
        // Check authentication
        const username = this.apiClient.getCurrentUser();
        if (!username) {
            window.location.href = '/login';
            return;
        }

        // Store username
        this.currentUser = username;

        // Setup event listeners
        this.setupEventListeners();
        
        // Load user info and welcome message
        this.loadUserInfo();
        
        // Load researches
        this.loadResearches();
    }

    async loadUserInfo() {
        try {
            this.userInfo = await this.apiClient.getUserInfo(this.currentUser);
            
            // Update welcome message
            const welcomeElement = document.getElementById('welcomeMessage');
            if (welcomeElement && this.userInfo.name) {
                welcomeElement.textContent = `Bienvenido ${this.userInfo.name}`;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            // Si falla, mostrar solo el username
            const welcomeElement = document.getElementById('welcomeMessage');
            if (welcomeElement) {
                welcomeElement.textContent = `Bienvenido ${this.currentUser}`;
            }
        }
    }

    setupEventListeners() {
        // Menu items
        document.querySelectorAll('.menu-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Add research buttons
        document.querySelectorAll('.btn-add-research').forEach(btn => {
            btn.addEventListener('click', () => {
                this.createNewResearch();
            });
        });

        // Back to list button
        document.getElementById('backToListBtn').addEventListener('click', () => {
            this.showResearchList();
        });

        // Profile form handlers
        document.getElementById('userInfoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUserInfo();
        });

        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        document.getElementById('cancelUserInfoBtn').addEventListener('click', () => {
            this.loadProfileData();
        });

        document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
            document.getElementById('changePasswordForm').reset();
        });

        // New research form handlers
        document.getElementById('newResearchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewResearch();
        });

        document.getElementById('cancelNewResearchBtn').addEventListener('click', () => {
            this.switchView('summary');
        });

        // Add criteria button
        document.getElementById('addCriteriaBtn').addEventListener('click', () => {
            this.addCriteriaInput();
        });

        // Delegate event for remove criteria buttons
        document.getElementById('criteriaContainer').addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-criteria')) {
                e.target.closest('.criteria-input-group').remove();
                this.updateRemoveButtons();
            }
        });

        // Research type change handler
        document.getElementById('researchType').addEventListener('change', (e) => {
            this.updateResearchTypeDescription(e.target.value);
        });
    }

    switchView(viewName) {
        // Update menu active state
        document.querySelectorAll('.menu-item[data-view]').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.menu-item[data-view="${viewName}"]`).classList.add('active');

        // Show corresponding view
        document.getElementById('summaryView').style.display = viewName === 'summary' ? 'block' : 'none';
        document.getElementById('profileView').style.display = viewName === 'profile' ? 'block' : 'none';
        document.getElementById('newResearchView').style.display = viewName === 'new-research' ? 'block' : 'none';

        // If switching to summary, ensure we're showing the list view
        if (viewName === 'summary') {
            this.showResearchList();
        }
        
        // If switching to profile, load profile data
        if (viewName === 'profile') {
            this.loadProfileData();
        }
        
        // If switching to new research, reset form
        if (viewName === 'new-research') {
            this.resetNewResearchForm();
        }
    }

    addCriteriaInput() {
        const container = document.getElementById('criteriaContainer');
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group mb-2 criteria-input-group';
        inputGroup.innerHTML = `
            <input type="text" class="form-control criteria-input" placeholder="Ingrese un criterio de inclusión" required>
            <button class="btn btn-outline-danger btn-remove-criteria" type="button">
                <i class="fas fa-minus"></i>
            </button>
        `;
        container.appendChild(inputGroup);
        this.updateRemoveButtons();
    }

    updateRemoveButtons() {
        const container = document.getElementById('criteriaContainer');
        const inputGroups = container.querySelectorAll('.criteria-input-group');
        
        // Show remove button only if there's more than one input
        inputGroups.forEach((group, index) => {
            const removeBtn = group.querySelector('.btn-remove-criteria');
            if (inputGroups.length > 1) {
                removeBtn.style.display = 'block';
            } else {
                removeBtn.style.display = 'none';
            }
        });
    }

    resetNewResearchForm() {
        document.getElementById('newResearchForm').reset();
        
        // Reset criteria inputs to just one
        const container = document.getElementById('criteriaContainer');
        container.innerHTML = `
            <div class="input-group mb-2 criteria-input-group">
                <input type="text" class="form-control criteria-input" placeholder="Ingrese un criterio de inclusión" required>
                <button class="btn btn-outline-danger btn-remove-criteria" type="button" style="display: none;">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `;
        
        // Clear research type description
        document.getElementById('researchTypeDescription').textContent = '';
    }

    updateResearchTypeDescription(typeValue) {
        const descriptions = {
            'Effectiveness': 'Objetivo: Evaluar la efectividad de un tratamiento o práctica en términos de su impacto en los resultados.',
            'Experiential': 'Objetivo: Investigar la experiencia o la significancia de un fenómeno particular.',
            'Costs': 'Objetivo: Determinar los costos asociados a un enfoque o estrategia de tratamiento, especialmente en términos de costo-efectividad o beneficio.',
            'Prevalence': 'Objetivo: Determinar la prevalencia y/o incidencia de una condición específica.',
            'Diagnostic': 'Objetivo: Determinar qué tan bien funciona una prueba diagnóstica en términos de sensibilidad y especificidad para un diagnóstico particular.',
            'Etiology': 'Objetivo: Determinar la asociación entre exposiciones o factores de riesgo específicos y los resultados.',
            'Expert Opinion': 'Objetivo: Revisar y sintetizar la opinión experta actual, textos o políticas sobre un fenómeno particular.',
            'Psychometric': 'Objetivo: Evaluar las propiedades psicométricas de un test, normalmente para determinar la confiabilidad y validez de un instrumento o evaluación.',
            'Prognostic': 'Objetivo: Determinar el pronóstico general de una condición, el vínculo entre factores pronósticos y un resultado, y/o modelos y pruebas de predicción.',
            'Methodology': 'Objetivo: Examinar e investigar métodos de investigación actuales y su posible impacto en la calidad de la investigación.'
        };

        const descriptionElement = document.getElementById('researchTypeDescription');
        descriptionElement.textContent = descriptions[typeValue] || '';
    }

    async loadResearches() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('researchTableContainer');

        try {
            loadingState.style.display = 'block';
            emptyState.style.display = 'none';
            tableContainer.style.display = 'none';

            const formData = new FormData();
            formData.append('username', this.currentUser);

            const response = await this.apiClient.makeRequest('/research/get-research-user', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type to let browser set it with boundary
            });

            // The response.researches is a dictionary with username as key
            // Extract the array of researches
            let researchesData = response.researches || {};
            
            // Convert dictionary to array
            if (typeof researchesData === 'object' && !Array.isArray(researchesData)) {
                // Get all research arrays from the dictionary
                this.currentResearches = [];
                Object.values(researchesData).forEach(researchArray => {
                    if (Array.isArray(researchArray)) {
                        this.currentResearches.push(...researchArray);
                    }
                });
            } else if (Array.isArray(researchesData)) {
                this.currentResearches = researchesData;
            } else {
                this.currentResearches = [];
            }
            
            loadingState.style.display = 'none';

            if (this.currentResearches.length === 0) {
                emptyState.style.display = 'block';
            } else {
                tableContainer.style.display = 'block';
                this.renderResearchTable();
            }

        } catch (error) {
            loadingState.style.display = 'none';
            console.error('Error loading researches:', error);
            this.showError('Error al cargar las investigaciones: ' + error.message);
        }
    }

    renderResearchTable() {
        const tbody = document.getElementById('researchTableBody');
        tbody.innerHTML = '';

        this.currentResearches.forEach(research => {
            const row = document.createElement('tr');
            row.dataset.researchId = research.id;
            row.addEventListener('click', () => this.showResearchDetail(research));

            const createdDate = new Date(research.created_at);
            const formattedDate = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const statusBadge = research.is_active 
                ? '<span class="badge badge-active">Activa</span>'
                : '<span class="badge badge-inactive">Inactiva</span>';

            row.innerHTML = `
                <td>
                    <strong>${this.escapeHtml(research.title)}</strong>
                    <br>
                    <small class="text-muted">${this.escapeHtml(research.type_research)}</small>
                </td>
                <td>${formattedDate}</td>
                <td><span class="badge-step badge-active">${this.escapeHtml(research.step || 'N/A')}</span></td>
                <td>${statusBadge}</td>
            `;

            tbody.appendChild(row);
        });
    }

    async showResearchDetail(research) {
        this.selectedResearch = research;
        this.currentView = 'detail';

        const listView = document.getElementById('researchListView');
        const detailView = document.getElementById('researchDetailView');
        const detailContent = document.getElementById('researchDetailContent');

        listView.style.display = 'none';
        detailView.style.display = 'block';

        // Show loading state
        detailContent.innerHTML = `
            <div class="loading-research">
                <img src="/static/imgs/load.gif" alt="Cargando..." style="max-width: 200px;">
                <p class="mt-3 text-muted">Cargando información de la investigación...</p>
            </div>
        `;

        // Load full research details from API
        try {
            const response = await this.apiClient.getResearch(this.apiClient.currentUser, research.id);
            const fullResearch = response.research;
            this.selectedResearch = fullResearch;

            // Load datasets for this research
            const datasetsResponse = await this.apiClient.listDatasets(research.id);
            const datasets = datasetsResponse.datasets || [];

            // Load trained ML models
            let trainedModels = [];
            try {
                const modelsResponse = await this.apiClient.getTrainedModels(research.id);
                trainedModels = modelsResponse.trained_models || [];
            } catch (error) {
                console.log('No trained models found');
            }

            // Load pipeline results if step is not 'Create Research'
            let pipelineResults = null;
            if (fullResearch.step !== 'Create Research') {
                try {
                    pipelineResults = await this.apiClient.getLabeledResults(research.id);
                } catch (error) {
                    console.log('No pipeline results yet');
                }
            }

            this.renderResearchDetail(fullResearch, datasets, pipelineResults, trainedModels);
        } catch (error) {
            console.error('Error loading research details:', error);
            this.showNotification('Error al cargar los detalles de la investigación', 'error');
        }
    }

    renderResearchDetail(research, datasets, pipelineResults = null, trainedModels = []) {
        const detailContent = document.getElementById('researchDetailContent');

        // Format dates
        const createdDate = new Date(research.created_at);
        const updatedDate = new Date(research.updated_at);
        
        const formatDate = (date) => {
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Parse criteria inclusion
        let criteriaHtml = '<p class="text-muted">No hay criterios de inclusión definidos</p>';
        if (research.criteria_inclusion && research.criteria_inclusion.length > 0) {
            // criteria_inclusion viene como array desde el endpoint /get-research
            const criteria = Array.isArray(research.criteria_inclusion) 
                ? research.criteria_inclusion 
                : research.criteria_inclusion.split('|&|');
            
            criteriaHtml = '<ul class="criteria-list">';
            criteria.forEach(criterion => {
                if (criterion && criterion.trim()) {
                    criteriaHtml += `<li>${this.escapeHtml(criterion)}</li>`;
                }
            });
            criteriaHtml += '</ul>';
        }

        detailContent.innerHTML = `
            <div class="detail-header">
                <h3>${this.escapeHtml(research.title)}</h3>
                <p class="mb-0">
                    <span class="badge ${research.is_active ? 'badge-active' : 'badge-inactive'}">
                        ${research.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                    ${research.is_test ? '<span class="badge bg-warning text-dark ms-2">Prueba</span>' : ''}
                </p>
            </div>

            <div class="detail-section">
                <h5><i class="fas fa-info-circle"></i> Información General</h5>
                <div class="detail-info">
                    <strong>ID:</strong> ${this.escapeHtml(research.id)}
                </div>
                <div class="detail-info">
                    <strong>Tipo de Investigación:</strong> ${this.escapeHtml(research.type_research)}
                </div>
                <div class="detail-info">
                    <strong>Metodología:</strong> ${this.escapeHtml(research.methodology || 'N/A')}
                </div>
                <div class="detail-info">
                    <strong>Paso Actual:</strong> ${this.escapeHtml(research.step || 'N/A')}
                </div>
            </div>

            <div class="detail-section">
                <h5><i class="fas fa-calendar-alt"></i> Fechas</h5>
                <div class="detail-info">
                    <strong>Fecha de Creación:</strong> ${formatDate(createdDate)}
                </div>
                <div class="detail-info">
                    <strong>Última Actualización:</strong> ${formatDate(updatedDate)}
                </div>
            </div>

            <div class="detail-section">
                <h5><i class="fas fa-list-check"></i> Criterios de Inclusión</h5>
                ${criteriaHtml}
            </div>

            ${pipelineResults ? this.renderPipelineResultsSection(pipelineResults) : ''}

            ${pipelineResults ? `
                <div class="detail-section" id="mlModelsSection">
                    <h5><i class="fas fa-brain"></i> Modelos ML Entrenados</h5>
                    <div id="mlModelsList">
                        <div class="text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando modelos...</span>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}}

            <div class="detail-section">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="fas fa-database"></i> Datasets</h5>
                    <button class="btn btn-success btn-sm" onclick="dashboard.showUploadDatasetModal()">
                        <i class="fas fa-upload"></i> Agregar Dataset
                    </button>
                </div>
                <div id="datasetsList">
                    ${this.renderDatasetsList(datasets)}
                </div>
                <div id="startPipelineContainer">
                    <!-- Start Pipeline button will be rendered here if conditions met -->
                </div>
            </div>

            <div class="mt-4">
                <button class="btn btn-primary me-2" onclick="dashboard.editResearch('${research.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-${research.is_active ? 'warning' : 'success'}" 
                        onclick="dashboard.toggleResearchStatus('${research.id}', ${research.is_active})">
                    <i class="fas fa-${research.is_active ? 'pause' : 'play'}"></i> 
                    ${research.is_active ? 'Desactivar' : 'Activar'}
                </button>
            </div>
        `;

        // Load ML models details if there are pipeline results
        if (pipelineResults) {
            this.loadMLModelsDetails(trainedModels);
        }
        // Check and render Start Pipeline button only if research has sufficient articles
        this.checkAndRenderStartPipeline(research.id, datasets.length > 0, research.step);
    }

    async checkAndRenderStartPipeline(researchId, hasDatasets, step) {
        const container = document.getElementById('startPipelineContainer');
        if (!container) return;

        // Hide by default
        container.innerHTML = '';

        // Only consider showing when research is in Create Research and has datasets
        if (!hasDatasets || step !== 'Create Research') return;

        try {
            const resp = await this.apiClient.getAllArticlesByResearch(researchId);
            const total = resp && (resp.total || 0);

            // Threshold: more than 1100 articles
            const threshold = 1100;
            if (total > threshold) {
                container.innerHTML = `
                    <div class="mt-3 text-end">
                        <button class="btn btn-lg btn-primary" onclick="dashboard.startPipeline('${researchId}')">
                            <i class="fas fa-play-circle"></i> Empezar Pipeline
                        </button>
                    </div>
                `;
            } else {
                // Optionally show info about why button is hidden
                container.innerHTML = `
                    <div class="mt-3 text-end text-muted small">Se requieren más de ${threshold.toLocaleString()} artículos para ejecutar el pipeline. (Actual: ${total})</div>
                `;
            }
        } catch (error) {
            console.error('Error checking article count for pipeline:', error);
        }
    }

    showResearchList() {
        this.currentView = 'list';
        document.getElementById('researchListView').style.display = 'block';
        document.getElementById('researchDetailView').style.display = 'none';
        this.selectedResearch = null;
    }

    async toggleResearchStatus(researchId, currentStatus) {
        try {
            const formData = new FormData();
            formData.append('username', this.currentUser);
            formData.append('research_id', researchId);

            const endpoint = currentStatus ? '/research/inactivate' : '/research/activate';

            await this.apiClient.makeRequest(endpoint, {
                method: 'POST',
                body: formData,
                headers: {}
            });

            this.showSuccess(`Investigación ${currentStatus ? 'desactivada' : 'activada'} correctamente`);
            
            // Reload researches and show updated detail
            await this.loadResearches();
            const updatedResearch = this.currentResearches.find(r => r.id === researchId);
            if (updatedResearch) {
                this.showResearchDetail(updatedResearch);
            }

        } catch (error) {
            console.error('Error toggling research status:', error);
            this.showError('Error al cambiar el estado: ' + error.message);
        }
    }

    editResearch(researchId) {
        // TODO: Implement edit functionality
        alert('Funcionalidad de edición en desarrollo');
    }

    createNewResearch() {
        this.switchView('new-research');
    }

    async saveNewResearch() {
        try {
            // Get form values
            const title = document.getElementById('researchTitle').value.trim();
            const typeResearch = document.getElementById('researchType').value;
            const methodology = document.getElementById('researchMethodology').value;
            const isTest = document.getElementById('researchIsTest').checked;

            // Get all criteria inputs
            const criteriaInputs = document.querySelectorAll('.criteria-input');
            const criteriaList = [];
            
            criteriaInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    criteriaList.push(value);
                }
            });

            // Validate required fields
            if (!title || !typeResearch || !methodology || criteriaList.length === 0) {
                this.showError('Por favor complete todos los campos obligatorios');
                return;
            }

            // Prepare data for API - criteria as comma-separated string
            const criteriaInclusion = criteriaList.join(',');

            // Create URL encoded form data
            const formData = new URLSearchParams();
            formData.append('username', this.currentUser);
            formData.append('title', title);
            formData.append('type_research', typeResearch);
            formData.append('methodology', methodology);
            formData.append('criteria_inclusion', criteriaInclusion);
            formData.append('is_active', 'true');
            formData.append('is_test', isTest.toString());

            const response = await this.apiClient.makeRequest('/research/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            this.showSuccess(`Investigación "${response.title}" creada exitosamente`);
            
            // Reset form and switch to summary view
            this.resetNewResearchForm();
            this.switchView('summary');
            
            // Reload researches
            await this.loadResearches();

        } catch (error) {
            console.error('Error creating research:', error);
            this.showError('Error al crear la investigación: ' + error.message);
        }
    }

    logout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.apiClient.logout();
        }
    }

    async loadProfileData() {
        const loadingState = document.getElementById('profileLoadingState');
        const profileContent = document.getElementById('profileContent');

        try {
            loadingState.style.display = 'block';
            profileContent.style.display = 'none';

            // Load user info if not already loaded
            if (!this.userInfo) {
                this.userInfo = await this.apiClient.getUserInfo(this.currentUser);
            }

            // Populate form fields
            document.getElementById('profileUsername').value = this.userInfo.username || '';
            document.getElementById('profileEmail').value = this.userInfo.email || '';
            document.getElementById('profileName').value = this.userInfo.name || '';
            document.getElementById('profileInstitution').value = this.userInfo.institution || '';
            document.getElementById('profileRole').value = this.userInfo.role || '';
            document.getElementById('profileStatus').value = this.userInfo.is_active ? 'Activo' : 'Inactivo';

            // Format dates
            const formatDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                const date = new Date(dateStr);
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };

            document.getElementById('profileCreatedAt').textContent = formatDate(this.userInfo.created_at);
            document.getElementById('profileUpdatedAt').textContent = formatDate(this.userInfo.updated_at);
            document.getElementById('profileLastLogin').textContent = formatDate(this.userInfo.last_login);

            loadingState.style.display = 'none';
            profileContent.style.display = 'block';

        } catch (error) {
            loadingState.style.display = 'none';
            console.error('Error loading profile data:', error);
            this.showError('Error al cargar la información del perfil: ' + error.message);
        }
    }

    async updateUserInfo() {
        try {
            const userData = {
                name: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value,
                institution: document.getElementById('profileInstitution').value
            };

            await this.apiClient.updateUser(this.currentUser, userData);
            
            // Reload user info
            this.userInfo = null;
            await this.loadUserInfo();
            await this.loadProfileData();

            this.showSuccess('Información actualizada correctamente');

        } catch (error) {
            console.error('Error updating user info:', error);
            this.showError('Error al actualizar la información: ' + error.message);
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas no coinciden');
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            this.showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            await this.apiClient.updatePassword(this.currentUser, currentPassword, newPassword);
            
            // Clear form
            document.getElementById('changePasswordForm').reset();
            
            this.showSuccess('Contraseña actualizada correctamente');

        } catch (error) {
            console.error('Error changing password:', error);
            this.showError('Error al cambiar la contraseña: ' + error.message);
        }
    }

    renderPipelineResultsSection(results) {
        const stats = results.statistics || {};
        const totalItems = stats.total || 0;
        const includeCount = stats.include || 0;
        const excludeCount = stats.exclude || 0;
        const noClassified = stats.not_classified || 0;
        
        const includePercent = stats.include_percent || 0;
        const excludePercent = stats.exclude_percent || 0;
        
        // Calculate total tokens
        const totalTokensInput = results.items.reduce((sum, item) => sum + (item.tokens_input || 0), 0);
        const totalTokensOutput = results.items.reduce((sum, item) => sum + (item.tokens_output || 0), 0);
        const totalTokens = totalTokensInput + totalTokensOutput;
        
        return `
            <div class="detail-section pipeline-results-section">
                <h5><i class="fas fa-chart-pie"></i> Resultados del Pipeline</h5>
                
                <div class="results-stats mb-4">
                    <div class="stat-card stat-total">
                        <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${totalItems}</div>
                            <div class="stat-label">Total Procesados</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-include">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${includeCount}</div>
                            <div class="stat-label">Incluir (${includePercent}%)</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-exclude">
                        <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${excludeCount}</div>
                            <div class="stat-label">Excluir (${excludePercent}%)</div>
                        </div>
                    </div>
                    
                    ${noClassified > 0 ? `
                        <div class="stat-card stat-pending">
                            <div class="stat-icon"><i class="fas fa-question-circle"></i></div>
                            <div class="stat-info">
                                <div class="stat-value">${noClassified}</div>
                                <div class="stat-label">No Clasificados</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="token-usage-info mb-4">
                    <div class="alert alert-info d-flex align-items-center" role="alert">
                        <i class="fas fa-info-circle me-3" style="font-size: 24px;"></i>
                        <div>
                            <strong>Tokens Utilizados:</strong>
                            <span class="ms-2">Input: ${totalTokensInput.toLocaleString()}</span>
                            <span class="ms-3">Output: ${totalTokensOutput.toLocaleString()}</span>
                            <span class="ms-3"><strong>Total: ${totalTokens.toLocaleString()}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="results-table-container">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Artículos Etiquetados</h6>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-success" onclick="dashboard.downloadAILabelerData()">
                                <i class="fas fa-download"></i> Descargar Base
                            </button>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-primary active" onclick="dashboard.filterResults('all')">
                                    Todos
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="dashboard.filterResults('include')">
                                    Incluir
                                </button>
                                <button type="button" class="btn btn-outline-danger" onclick="dashboard.filterResults('exclude')">
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-hover table-sm">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th style="width: 50%">Abstract</th>
                                    <th style="width: 15%">Predicción</th>
                                    <th style="width: 15%">Confianza</th>
                                    <th style="width: 20%">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="pipelineResultsTable">
                                ${this.renderPipelineResultsRows(results.items)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderPipelineResultsRows(items, filter = 'all') {
        if (!items || items.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted">No hay resultados</td></tr>';
        }
        
        let filteredItems = items;
        if (filter !== 'all') {
            filteredItems = items.filter(item => {
                if (!item.prediction) return false;
                const pred = item.prediction.toLowerCase();
                return pred === filter || pred === filter + 'd';
            });
        }
        
        return filteredItems.map(item => {
            const prediction = item.prediction ? item.prediction.toLowerCase() : 'n/a';
            // Handle both 'include'/'included' and 'exclude'/'excluded'
            const isInclude = prediction.includes('include');
            const isExclude = prediction.includes('exclude');
            
            const badgeClass = isInclude ? 'badge-success' : 
                              isExclude ? 'badge-danger' : 'badge-secondary';
            const predictionText = isInclude ? 'Incluir' : 
                                  isExclude ? 'Excluir' : 'N/A';
            const filterValue = isInclude ? 'include' : isExclude ? 'exclude' : 'n/a';
            
            // Truncate abstract to first 150 characters
            const abstract = item.abstract || 'Sin abstract';
            const truncatedAbstract = abstract.length > 150 ? 
                abstract.substring(0, 150) + '...' : abstract;
            
            return `
                <tr data-filter="${filterValue}">
                    <td>
                        <small>${this.escapeHtml(truncatedAbstract)}</small>
                    </td>
                    <td>
                        <span class="badge ${badgeClass}">${predictionText}</span>
                    </td>
                    <td>
                        <small class="text-muted">${item.flag_complete ? 'Completo' : 'Parcial'}</small>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="dashboard.showEditPredictionModal('${item.id_article}', '${this.escapeHtml(item.abstract)}', '${item.prediction}', '${this.escapeHtml(item.reasoning || '')}')">
                            <i class="fas fa-edit"></i> Modificar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterResults(filter) {
        const buttons = document.querySelectorAll('.results-table-container .btn-group button');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const rows = document.querySelectorAll('#pipelineResultsTable tr');
        rows.forEach(row => {
            if (filter === 'all') {
                row.style.display = '';
            } else {
                const rowFilter = row.getAttribute('data-filter');
                row.style.display = rowFilter === filter ? '' : 'none';
            }
        });
    }

    showEditPredictionModal(articleId, abstract, currentPrediction, reasoning) {
        // Normalize prediction
        const isInclude = currentPrediction && currentPrediction.toLowerCase().includes('include');
        const normalizedPrediction = isInclude ? 'Include' : 'Exclude';
        
        const modalHtml = `
            <div class="modal fade" id="editPredictionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-edit"></i> Modificar Predicción</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label fw-bold">Abstract</label>
                                <div class="p-3 bg-light rounded" style="max-height: 200px; overflow-y: auto;">
                                    <small>${abstract}</small>
                                </div>
                            </div>
                            
                            ${reasoning ? `
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Razonamiento IA</label>
                                    <div class="p-3 bg-light rounded" style="max-height: 150px; overflow-y: auto;">
                                        <small>${reasoning}</small>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="mb-3">
                                <label for="predictionSelect" class="form-label fw-bold">Predicción</label>
                                <select class="form-select" id="predictionSelect">
                                    <option value="Include" ${normalizedPrediction === 'Include' ? 'selected' : ''}>
                                        Incluir
                                    </option>
                                    <option value="Exclude" ${normalizedPrediction === 'Exclude' ? 'selected' : ''}>
                                        Excluir
                                    </option>
                                </select>
                            </div>
                            
                            <input type="hidden" id="editArticleId" value="${articleId}">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="dashboard.updateArticlePrediction()">
                                <i class="fas fa-save"></i> Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('editPredictionModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editPredictionModal'));
        modal.show();
    }

    async updateArticlePrediction() {
        const articleId = document.getElementById('editArticleId').value;
        const newPrediction = document.getElementById('predictionSelect').value;
        
        try {
            const response = await this.apiClient.updatePrediction(
                this.apiClient.currentUser,
                articleId,
                newPrediction
            );
            
            this.showNotification(response.message || 'Predicción actualizada exitosamente', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPredictionModal'));
            modal.hide();
            
            // Reload research details to show updated prediction
            await this.showResearchDetail(this.selectedResearch);
        } catch (error) {
            console.error('Error updating prediction:', error);
            this.showNotification(error.message || 'Error al actualizar la predicción', 'error');
        }
    }

    renderDatasetsList(datasets) {
        if (!datasets || datasets.length === 0) {
            return '<p class="text-muted">No hay datasets cargados para esta investigación.</p>';
        }

        let html = '<div class="list-group">';
        datasets.forEach(dataset => {
            const uploadDate = new Date(dataset.created_at);
            const formattedDate = uploadDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">
                                <i class="fas fa-file-excel text-success me-2"></i>
                                ${this.escapeHtml(dataset.filename)}
                            </h6>
                            <p class="mb-1 text-muted small">
                                <i class="fas fa-calendar me-1"></i> ${formattedDate}
                                <span class="ms-3"><i class="fas fa-list-ol me-1"></i> ${dataset.number_of_records} registros</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        return html;
    }

    async loadMLModelsDetails(trainedModels) {
        const container = document.getElementById('mlModelsList');
        
        try {
            // Load details for each model
            const modelDetailsPromises = trainedModels.map(model => 
                this.apiClient.getModelDetails(model.id)
            );
            
            const modelsDetails = await Promise.all(modelDetailsPromises);
            
            // Render models with their metrics
            this.renderMLModels(modelsDetails);
            
        } catch (error) {
            console.error('Error loading ML models details:', error);
            container.innerHTML = '<p class="text-danger">Error al cargar los modelos ML</p>';
        }
    }

    renderMLModels(modelsDetails) {
        const container = document.getElementById('mlModelsList');
        
        if (!modelsDetails || modelsDetails.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted mb-3">No hay modelos ML entrenados aún.</p>
                    <button class="btn btn-primary" onclick="dashboard.trainNewModel()">
                        <i class="fas fa-graduation-cap"></i> Entrenar Modelo
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="row g-3">';
        
        modelsDetails.forEach((model, index) => {
            const createdDate = new Date(model.create_at);
            const formattedDate = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Multiply metrics by 100 for percentage display
            const accuracy = Math.round((model.accuracy || 0) * 100);
            const recall = Math.round((model.recall || 0) * 100);
            const f1Score = Math.round((model.f1_score || 0) * 100);

            html += `
                <div class="col-md-6">
                    <div class="ml-model-card">
                        <div class="ml-model-header">
                            <h6>
                                <i class="fas fa-brain text-primary me-2"></i>
                                Modelo v${model.version}
                            </h6>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${formattedDate}
                            </small>
                        </div>
                        
                        <div class="metrics-grid">
                            <div class="metric-speedometer">
                                <canvas id="metricAccuracy${index}" width="120" height="80"></canvas>
                                <div class="metric-label">Accuracy</div>
                            </div>
                            <div class="metric-speedometer">
                                <canvas id="metricRecall${index}" width="120" height="80"></canvas>
                                <div class="metric-label">Recall</div>
                            </div>
                            <div class="metric-speedometer">
                                <canvas id="metricF1${index}" width="120" height="80"></canvas>
                                <div class="metric-label">F1-Score</div>
                            </div>
                        </div>
                        
                        <div class="mt-3 d-flex gap-2 justify-content-end">
                            <button class="btn btn-outline-primary btn-sm" onclick="dashboard.openInferenceTab('${model.id}', 'batch')">
                                <i class="fas fa-database"></i> Predecir Resto de la Base
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="dashboard.openInferenceTab('${model.id}', 'individual')">
                                <i class="fas fa-file-alt"></i> Predecir Individual
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add "Train New Model" button at the end
        html += `
            <div class="text-center mt-4">
                <button class="btn btn-success" onclick="dashboard.trainNewModel()">
                    <i class="fas fa-graduation-cap"></i> Entrenar Nuevo Modelo
                </button>
            </div>
        `;
        
        container.innerHTML = html;

        // Draw speedometers after HTML is rendered
        modelsDetails.forEach((model, index) => {
            const accuracy = Math.round((model.accuracy || 0) * 100);
            const recall = Math.round((model.recall || 0) * 100);
            const f1Score = Math.round((model.f1_score || 0) * 100);

            this.drawSpeedometer(`metricAccuracy${index}`, accuracy);
            this.drawSpeedometer(`metricRecall${index}`, recall);
            this.drawSpeedometer(`metricF1${index}`, f1Score);
        });
    }

    drawSpeedometer(canvasId, value) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 60;
        const centerY = 60;
        const radius = 50;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw arc background (gray)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#e0e0e0';
        ctx.stroke();
        
        // Calculate angle based on value (0-100 mapped to PI to 2*PI)
        const angle = Math.PI + (value / 100) * Math.PI;
        
        // Determine color based on value
        let color;
        if (value < 50) {
            color = '#f44336'; // Red
        } else if (value < 70) {
            color = '#ff9800'; // Orange
        } else if (value < 85) {
            color = '#2196f3'; // Blue
        } else {
            color = '#4caf50'; // Green
        }
        
        // Draw arc progress
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, angle);
        ctx.lineWidth = 10;
        ctx.strokeStyle = color;
        ctx.stroke();
        
        // Draw value text
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${value}%`, centerX, centerY);
    }

    openInferenceTab(modelId, type) {
        if (type === 'batch') {
            this.startBatchInference(modelId);
        } else {
            this.showIndividualInference(modelId);
        }
    }

    showIndividualInference(modelId) {
        // Switch to individual inference view
        this.currentView = 'individual-inference';
        document.getElementById('researchDetailView').style.display = 'none';
        document.getElementById('individualInferenceView').style.display = 'block';
        
        // Store model ID for later use
        this.currentInferenceModelId = modelId;
        
        // Render the interface
        const container = document.getElementById('individualInferenceContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-brain"></i> Predicción Individual</h5>
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.backToResearch()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="abstractTextInput" class="form-label">Nuevo Abstract</label>
                        <textarea 
                            class="form-control" 
                            id="abstractTextInput" 
                            rows="8" 
                            placeholder="Ingrese el abstract del artículo a clasificar..."></textarea>
                    </div>
                    <div class="text-end mb-4">
                        <button class="btn btn-primary btn-lg" onclick="dashboard.executeTextInference()">
                            <i class="fas fa-play-circle"></i> Predecir
                        </button>
                    </div>
                    <div id="individualInferenceResults"></div>
                </div>
            </div>
        `;
    }

    async executeTextInference() {
        const abstractText = document.getElementById('abstractTextInput').value.trim();
        const resultsContainer = document.getElementById('individualInferenceResults');
        
        if (!abstractText) {
            alert('Por favor ingrese un abstract');
            return;
        }
        
        try {
            // Show loading
            resultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Procesando...</span>
                    </div>
                    <p class="mt-2 text-muted">Ejecutando predicción...</p>
                </div>
            `;
            
            const response = await this.apiClient.executeTextInference(
                this.apiClient.currentUser,
                this.currentInferenceModelId,
                abstractText
            );
            
            this.renderIndividualInferenceResults(response);
            
        } catch (error) {
            console.error('Error in text inference:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error: ${error.message}
                </div>
            `;
        }
    }

    renderIndividualInferenceResults(result) {
        const resultsContainer = document.getElementById('individualInferenceResults');
        
        const prediction = result.prediction.toLowerCase();
        const isIncluded = prediction.includes('include');
        const probExcluded = Math.round(result.probability_excluded * 100);
        const probIncluded = Math.round(result.probability_included * 100);
        
        resultsContainer.innerHTML = `
            <div class="result-card">
                <h5 class="mb-4"><i class="fas fa-chart-bar"></i> Resultado de la Predicción</h5>
                
                <div class="prediction-result mb-4">
                    <div class="alert alert-${isIncluded ? 'success' : 'danger'} d-flex align-items-center">
                        <i class="fas fa-${isIncluded ? 'check-circle' : 'times-circle'} fa-3x me-3"></i>
                        <div>
                            <h4 class="mb-0">${isIncluded ? 'INCLUIR' : 'EXCLUIR'}</h4>
                            <p class="mb-0">Predicción del modelo ML</p>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="probability-card ${isIncluded ? 'active' : ''}">
                            <canvas id="probIncludedChart" width="150" height="150"></canvas>
                            <h6 class="mt-3">Probabilidad de INCLUIR</h6>
                            <h3 class="text-success">${probIncluded}%</h3>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="probability-card ${!isIncluded ? 'active' : ''}">
                            <canvas id="probExcludedChart" width="150" height="150"></canvas>
                            <h6 class="mt-3">Probabilidad de EXCLUIR</h6>
                            <h3 class="text-danger">${probExcluded}%</h3>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Draw probability charts
        this.drawProbabilityChart('probIncludedChart', probIncluded, '#4caf50');
        this.drawProbabilityChart('probExcludedChart', probExcluded, '#f44336');
    }

    drawProbabilityChart(canvasId, percentage, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 75;
        const centerY = 75;
        const radius = 60;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        
        // Draw percentage arc
        const angle = (percentage / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw white circle in center to create donut effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw percentage text
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, centerX, centerY);
    }

    async startBatchInference(modelId) {
        if (!this.selectedResearch) {
            this.showNotification('No hay investigación seleccionada', 'error');
            return;
        }

        const researchId = this.selectedResearch.id;
        const username = this.apiClient.currentUser;

        if (!confirm('¿Desea ejecutar predicción masiva sobre toda la base de datos?')) {
            return;
        }

        // Switch to batch inference view
        this.currentView = 'batch-inference';
        document.getElementById('researchDetailView').style.display = 'none';
        document.getElementById('batchInferenceView').style.display = 'block';

        await this.executeBatchInference(modelId, researchId, username);
    }

    async executeBatchInference(modelId, researchId, username) {
        const progressContainer = document.getElementById('batchInferenceProgress');
        const resultsContainer = document.getElementById('batchInferenceResults');

        try {
            // Show loading state
            progressContainer.innerHTML = `
                <div class="text-center py-5">
                    <img src="/static/imgs/load.gif" alt="Cargando..." style="max-width: 200px;">
                    <p class="mt-3 text-muted">Obteniendo todos los artículos de la investigación...</p>
                </div>
            `;
            resultsContainer.innerHTML = '';

            // Get ALL article IDs from ALL datasets in the research
            const articlesResponse = await this.apiClient.getAllArticlesByResearch(researchId);
            const articleIds = articlesResponse.article_ids || [];

            if (articleIds.length === 0) {
                throw new Error('No hay artículos en la base de datos de esta investigación');
            }

            const totalArticles = articleIds.length;

            // Show progress container
            progressContainer.innerHTML = `
                <div class="text-center py-5">
                    <p class="mb-3 text-muted">Ejecutando predicción masiva...</p>
                    <div class="progress" style="max-width: 500px; margin: 0 auto; height: 30px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" 
                             id="batchProgressBar"
                             style="width: 0%; font-size: 14px; line-height: 30px;">
                            0%
                        </div>
                    </div>
                    <p class="mt-2 text-muted" id="batchProgressText">0/${totalArticles} artículos procesados</p>
                    <p class="text-muted mt-2"><small>Este proceso puede tomar varios minutos</small></p>
                </div>
            `;

            // Execute batch inference with progress tracking
            await this.executeBatchInferenceWithProgress(username, modelId, articleIds, totalArticles);

            // After completion, get and show results
            const predictions = await this.apiClient.getMLPredictions(researchId);

            // Show results
            this.renderBatchInferenceResults({ predictions: predictions.predictions || [] }, totalArticles);

        } catch (error) {
            console.error('Error in batch inference:', error);
            progressContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-danger mb-3">Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="dashboard.backToResearch()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                </div>
            `;
        }
    }

    async executeBatchInferenceWithProgress(username, modelId, articleIds, totalArticles) {
        const batchSize = 50; // Procesar 50 artículos por lote
        let processed = 0;
        let totalNew = 0;
        let totalSkipped = 0;

        // Procesar en lotes
        for (let i = 0; i < articleIds.length; i += batchSize) {
            const batch = articleIds.slice(i, Math.min(i + batchSize, articleIds.length));
            
            try {
                // Ejecutar inferencia del lote usando batch_inference endpoint
                const response = await this.apiClient.executeBatchInference(username, modelId, batch);
                totalNew += response.total_processed || 0;
                totalSkipped += response.total_skipped || 0;
            } catch (error) {
                console.error(`Error procesando lote ${i}-${i + batchSize}:`, error);
            }
            
            processed = Math.min(i + batchSize, articleIds.length);
            
            // Actualizar barra de progreso
            const percentage = Math.round((processed / totalArticles) * 100);
            const progressBar = document.getElementById('batchProgressBar');
            const progressText = document.getElementById('batchProgressText');
            
            if (progressBar && progressText) {
                progressBar.style.width = percentage + '%';
                progressBar.textContent = percentage + '%';
                progressText.textContent = `${processed}/${totalArticles} artículos procesados`;
            }
            
            // Pequeña pausa para actualizar UI
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Batch inference completed: ${totalNew} new, ${totalSkipped} skipped`);
    }

    renderBatchInferenceResults(response, totalArticles) {
        const progressContainer = document.getElementById('batchInferenceProgress');
        const resultsContainer = document.getElementById('batchInferenceResults');

        progressContainer.innerHTML = '';

        const predictions = response.predictions || [];
        const includeCount = predictions.filter(p => p.prediction && p.prediction.toLowerCase().includes('include')).length;
        const excludeCount = predictions.filter(p => p.prediction && p.prediction.toLowerCase().includes('exclude')).length;

        resultsContainer.innerHTML = `
            <div class="detail-section">
                <h5><i class="fas fa-chart-bar"></i> Resultados de Predicción Masiva</h5>
                
                <div class="results-stats mb-4">
                    <div class="stat-card stat-total">
                        <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${totalArticles}</div>
                            <div class="stat-label">Total Procesados</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-include">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${includeCount}</div>
                            <div class="stat-label">Incluir (${Math.round((includeCount/totalArticles)*100)}%)</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-exclude">
                        <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${excludeCount}</div>
                            <div class="stat-label">Excluir (${Math.round((excludeCount/totalArticles)*100)}%)</div>
                        </div>
                    </div>
                </div>

                <div class="mb-3 text-end">
                    <button class="btn btn-success" onclick="dashboard.downloadMLPredictions()">
                        <i class="fas fa-download"></i> Descargar Resultados CSV
                    </button>
                </div>
                
                <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                    <table class="table table-hover table-sm">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="width: 50%">Abstract</th>
                                <th style="width: 20%">Predicción</th>
                                <th style="width: 15%">Confianza</th>
                                <th style="width: 15%">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderMLPredictionRows(predictions)}
                        </tbody>
                    </table>
                </div>

                <div class="mt-4">
                    <button class="btn btn-primary" onclick="dashboard.backToResearch()">
                        <i class="fas fa-arrow-left"></i> Volver a Investigación
                    </button>
                </div>
            </div>
        `;
    }

    renderMLPredictionRows(predictions) {
        if (!predictions || predictions.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted">No hay predicciones</td></tr>';
        }

        return predictions.map(item => {
            const prediction = item.prediction ? item.prediction.toLowerCase() : 'n/a';
            const isInclude = prediction.includes('include');
            const isExclude = prediction.includes('exclude');
            
            const badgeClass = isInclude ? 'badge-success' : 
                              isExclude ? 'badge-danger' : 'badge-secondary';
            const predictionText = isInclude ? 'Incluir' : 
                                  isExclude ? 'Excluir' : 'N/A';
            
            const abstract = item.abstract || 'Sin abstract';
            const truncatedAbstract = abstract.length > 150 ? 
                abstract.substring(0, 150) + '...' : abstract;

            const confidence = item.confidence ? (item.confidence * 100).toFixed(1) + '%' : 'N/A';
            const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : 'N/A';
            
            return `
                <tr>
                    <td><small>${this.escapeHtml(truncatedAbstract)}</small></td>
                    <td><span class="badge ${badgeClass}">${predictionText}</span></td>
                    <td><small>${confidence}</small></td>
                    <td><small>${date}</small></td>
                </tr>
            `;
        }).join('');
    }

    async downloadAILabelerData() {
        if (!this.selectedResearch) {
            this.showNotification('No hay investigación seleccionada', 'error');
            return;
        }

        try {
            await this.apiClient.downloadAILabelerCSV(this.selectedResearch.id);
            this.showNotification('Descarga iniciada', 'success');
        } catch (error) {
            console.error('Error downloading AI Labeler data:', error);
            this.showNotification('Error al descargar: ' + error.message, 'error');
        }
    }

    async downloadMLPredictions() {
        if (!this.selectedResearch) {
            this.showNotification('No hay investigación seleccionada', 'error');
            return;
        }

        try {
            await this.apiClient.downloadMLClassifierCSV(this.selectedResearch.id);
            this.showNotification('Descarga iniciada', 'success');
        } catch (error) {
            console.error('Error downloading ML predictions:', error);
            this.showNotification('Error al descargar: ' + error.message, 'error');
        }
    }

    async trainNewModel() {
        if (!this.selectedResearch) {
            this.showNotification('No hay investigación seleccionada', 'error');
            return;
        }

        const researchId = this.selectedResearch.id;
        const username = this.apiClient.currentUser;

        if (!confirm('¿Desea entrenar un nuevo modelo ML con los datos etiquetados?')) {
            return;
        }

        const mlModelsContainer = document.getElementById('mlModelsList');
        
        try {
            // Show loading state in ML models section
            mlModelsContainer.innerHTML = `
                <div class="text-center py-5">
                    <img src="/static/imgs/load.gif" alt="Cargando..." style="max-width: 200px;">
                    <p class="mt-3 text-muted">Entrenando nuevo modelo ML...</p>
                    <p class="text-muted"><small>Este proceso puede tomar algunos minutos</small></p>
                </div>
            `;

            // Show loading notification
            this.showNotification('Obteniendo datos etiquetados...', 'info');

            // Get labeled results from AI Labeler
            const labeledResults = await this.apiClient.getLabeledResults(researchId);

            if (!labeledResults.items || labeledResults.items.length === 0) {
                throw new Error('No hay artículos etiquetados disponibles para entrenar el modelo');
            }

            // Prepare training data
            const trainingData = labeledResults.items.map(item => ({
                article_id: item.id_article,
                abstract: item.abstract,
                label: item.prediction ? item.prediction.toLowerCase() : 'exclude'
            }));

            this.showNotification(`Entrenando modelo con ${trainingData.length} artículos...`, 'info');

            // Train model using the API client method
            const trainResponse = await this.apiClient.trainMLModel(username, researchId, trainingData);

            this.showNotification('Modelo entrenado exitosamente', 'success');

            // Reload research details to show new model
            await this.showResearchDetail(this.selectedResearch);

        } catch (error) {
            console.error('Error training model:', error);
            this.showNotification('Error al entrenar el modelo: ' + error.message, 'error');
            
            // Restore ML models section on error
            mlModelsContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-danger mb-3">Error al entrenar el modelo</p>
                    <button class="btn btn-primary" onclick="dashboard.trainNewModel()">
                        <i class="fas fa-graduation-cap"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }

    showUploadDatasetModal() {
        const modalHtml = `
            <div class="modal fade" id="uploadDatasetModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Agregar Dataset</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="uploadFormContainer">
                                <form id="uploadDatasetForm">
                                    <div class="mb-3">
                                        <label for="datasetFile" class="form-label">Seleccionar archivo</label>
                                        <input type="file" class="form-control" id="datasetFile" 
                                               accept=".csv,.xlsx" required>
                                        <div class="form-text">Formatos permitidos: .csv, .xlsx</div>
                                    </div>
                                </form>
                            </div>
                            <div id="uploadLoadingContainer" style="display: none;" class="text-center py-4">
                                <img src="/static/imgs/load.gif" alt="Cargando..." style="max-width: 200px;">
                                <p class="mt-3 text-muted">Subiendo dataset, por favor espere...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelUploadBtn">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="dashboard.uploadDataset()" id="uploadBtn">
                                <i class="fas fa-upload"></i> Subir Dataset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('uploadDatasetModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('uploadDatasetModal'));
        modal.show();
    }

    async uploadDataset() {
        const fileInput = document.getElementById('datasetFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('Por favor seleccione un archivo', 'error');
            return;
        }

        // Validate file extension
        const validExtensions = ['.csv', '.xlsx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            this.showNotification('Formato de archivo no válido. Use .csv o .xlsx', 'error');
            return;
        }

        // Show loading GIF and hide form
        const formContainer = document.getElementById('uploadFormContainer');
        const loadingContainer = document.getElementById('uploadLoadingContainer');
        const uploadBtn = document.getElementById('uploadBtn');
        const cancelBtn = document.getElementById('cancelUploadBtn');
        
        formContainer.style.display = 'none';
        loadingContainer.style.display = 'block';
        uploadBtn.disabled = true;
        cancelBtn.disabled = true;

        try {
            const response = await this.apiClient.uploadDataset(this.selectedResearch.id, file);
            
            this.showNotification(response.message || 'Dataset cargado exitosamente', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadDatasetModal'));
            modal.hide();
            
            // Reload research details to show new dataset
            await this.showResearchDetail(this.selectedResearch);
        } catch (error) {
            console.error('Error uploading dataset:', error);
            this.showNotification(error.message || 'Error al subir el dataset', 'error');
            
            // Restore form on error
            formContainer.style.display = 'block';
            loadingContainer.style.display = 'none';
            uploadBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    }

    startPipeline(researchId) {
        this.currentView = 'pipeline';
        document.getElementById('researchDetailView').style.display = 'none';
        document.getElementById('pipelineView').style.display = 'block';
        
        this.executePipeline(researchId);
    }

    async executePipeline(researchId) {
        const research = this.selectedResearch;
        const username = this.apiClient.currentUser;
        
        console.log('Research methodology:', research.methodology);
        
        const steps = [
            { id: 1, name: 'Crear VectorStore', status: 'pending' },
            { id: 2, name: 'Búsqueda Semántica', status: 'pending' },
            { id: 3, name: 'Etiquetar con IA', status: 'pending' }
        ];
        
        // Check if methodology is Automatizada (case-insensitive and trim spaces)
        const isAutomatizada = research.methodology && research.methodology.trim().toLowerCase() === 'automatizada';
        console.log('Is Automatizada methodology?', isAutomatizada);
        
        if (isAutomatizada) {
            steps.push({ id: 4, name: 'Entrenar Modelo ML', status: 'pending' });
        }
        
        console.log('Total steps:', steps.length);
        
        this.renderPipelineProgress(steps);
        
        try {
            // Step 1: Create VectorStore
            this.updateStepStatus(1, 'running');
            const vectorResponse = await this.apiClient.createVectorStore(username, researchId);
            this.updateStepStatus(1, 'completed', vectorResponse.message);
            
            // Step 2: Semantic Search
            this.updateStepStatus(2, 'running');
            const queryResponse = await this.apiClient.queryRetriever(username, researchId);
            const articleIds = queryResponse.results || [];
            this.updateStepStatus(2, 'completed', `${articleIds.length} artículos encontrados`);
            
            // Step 3: Label with AI
            this.updateStepStatus(3, 'running');
            let labeledCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < articleIds.length; i++) {
                try {
                    const labelResponse = await this.apiClient.labelArticle(username, researchId, articleIds[i]);
                    if (labelResponse.message && labelResponse.message.includes('éxito')) {
                        labeledCount++;
                    }
                    this.updateStepProgress(3, `${i + 1}/${articleIds.length} artículos procesados`);
                } catch (error) {
                    failedCount++;
                    console.error(`Error labeling article ${articleIds[i]}:`, error);
                }
            }
            
            this.updateStepStatus(3, 'completed', `${labeledCount} etiquetados, ${failedCount} fallidos`);
            
            // Step 4: Train ML Model (only if Automatizada methodology)
            const isAutomatizada = research.methodology && research.methodology.trim().toLowerCase() === 'automatizada';
            if (isAutomatizada) {
                this.updateStepStatus(4, 'running');
                
                try {
                    // Get labeled results
                    const labeledResults = await this.apiClient.getLabeledResults(researchId);
                    
                    if (!labeledResults.items || labeledResults.items.length === 0) {
                        throw new Error('No hay artículos etiquetados para entrenar el modelo');
                    }
                    
                    // Prepare data for training
                    const trainingData = labeledResults.items.map(item => ({
                        article_id: item.id_article,
                        abstract: item.abstract,
                        label: item.prediction ? item.prediction.toLowerCase() : 'exclude'
                    }));
                    
                    this.updateStepProgress(4, `Preparando ${trainingData.length} artículos para entrenamiento...`);
                    
                    // Train model
                    const trainResponse = await this.apiClient.trainMLModel(username, researchId, trainingData);
                    
                    this.updateStepStatus(4, 'completed', `Modelo entrenado con ${trainingData.length} artículos`);
                } catch (error) {
                    console.error('Error training ML model:', error);
                    this.updateStepStatus(4, 'error', 'Error al entrenar el modelo: ' + error.message);
                    throw error;
                }
            }
            
            // Update research step
            await this.apiClient.updateResearchStep(researchId, 'Pipeline Completed');
            
            this.showNotification('Pipeline completado exitosamente', 'success');
            
            // Show results
            setTimeout(() => {
                this.showPipelineResults(researchId, labeledCount, articleIds.length, research.methodology);
            }, 2000);
            
        } catch (error) {
            console.error('Pipeline error:', error);
            this.showNotification('Error en el pipeline: ' + error.message, 'error');
        }
    }

    renderPipelineProgress(steps) {
        const container = document.getElementById('pipelineProgressContainer');
        let html = '<div class="pipeline-steps">';
        
        steps.forEach(step => {
            html += `
                <div class="pipeline-step" id="step-${step.id}">
                    <div class="step-header">
                        <div class="step-icon" id="step-icon-${step.id}">
                            <i class="fas fa-circle"></i>
                        </div>
                        <div class="step-info">
                            <h5>${step.name}</h5>
                            <p class="step-status" id="step-status-${step.id}">Esperando...</p>
                            <div class="step-progress-text" id="step-progress-text-${step.id}" style="display: none;">
                                <small class="text-muted"></small>
                            </div>
                        </div>
                    </div>
                    <div class="step-progress" id="step-progress-${step.id}" style="display: none;">
                        <img src="/static/imgs/load.gif" style="max-width: 100px;">
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    updateStepStatus(stepId, status, message = '') {
        const stepIcon = document.getElementById(`step-icon-${stepId}`);
        const stepStatus = document.getElementById(`step-status-${stepId}`);
        const stepProgress = document.getElementById(`step-progress-${stepId}`);
        const stepElement = document.getElementById(`step-${stepId}`);
        
        stepElement.className = 'pipeline-step';
        
        if (status === 'running') {
            stepElement.classList.add('running');
            stepIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            stepStatus.textContent = 'Ejecutando...';
            stepProgress.style.display = 'block';
        } else if (status === 'completed') {
            stepElement.classList.add('completed');
            stepIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
            stepStatus.textContent = message || 'Completado';
            stepProgress.style.display = 'none';
        } else if (status === 'error') {
            stepElement.classList.add('error');
            stepIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
            stepStatus.textContent = message || 'Error';
            stepProgress.style.display = 'none';
        }
    }

    updateStepProgress(stepId, message) {
        const stepStatus = document.getElementById(`step-status-${stepId}`);
        const stepProgressText = document.getElementById(`step-progress-text-${stepId}`);
        
        if (stepStatus) {
            stepStatus.textContent = 'Ejecutando...';
        }
        
        if (stepProgressText) {
            stepProgressText.style.display = 'block';
            stepProgressText.querySelector('small').textContent = message;
        }
    }

    showPipelineResults(researchId, labeledCount, totalArticles, methodology) {
        const container = document.getElementById('pipelineProgressContainer');
        
        const isAutomatizada = methodology && methodology.trim().toLowerCase() === 'automatizada';
        
        container.innerHTML += `
            <div class="pipeline-results mt-4">
                <h4><i class="fas fa-chart-bar"></i> Resultados del Pipeline</h4>
                <div class="results-summary">
                    <div class="result-card">
                        <div class="result-value">${totalArticles}</div>
                        <div class="result-label">Artículos Procesados</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value">${labeledCount}</div>
                        <div class="result-label">Artículos Etiquetados</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value">${Math.round((labeledCount/totalArticles)*100)}%</div>
                        <div class="result-label">Tasa de Éxito</div>
                    </div>
                    ${isAutomatizada ? `
                        <div class="result-card">
                            <div class="result-icon"><i class="fas fa-brain"></i></div>
                            <div class="result-label">Modelo ML Entrenado</div>
                        </div>
                    ` : ''}
                </div>
                <div class="mt-4">
                    <button class="btn btn-primary" onclick="dashboard.backToResearch()">
                        <i class="fas fa-arrow-left"></i> Volver a Investigación
                    </button>
                </div>
            </div>
        `;
    }

    backToResearch() {
        document.getElementById('pipelineView').style.display = 'none';
        document.getElementById('batchInferenceView').style.display = 'none';
        document.getElementById('individualInferenceView').style.display = 'none';
        this.showResearchDetail(this.selectedResearch);
    }

    showNotification(message, type = 'info') {
        // Use existing showError/showSuccess methods
        if (type === 'error') {
            this.showError(message);
        } else if (type === 'success') {
            this.showSuccess(message);
        } else if (type === 'info') {
            // For info messages, use a simple console log and optional alert for important ones
            console.log('INFO:', message);
            // You can show a toast notification here if you have a toast library
        } else {
            alert(message);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple alert for now, can be replaced with a better notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple alert for now, can be replaced with a better notification system
        alert(message);
    }
}

// Initialize dashboard when DOM is ready
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});
