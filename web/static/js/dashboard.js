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

        // Load full research details from API
        try {
            const response = await this.apiClient.getResearch(this.apiClient.currentUser, research.id);
            const fullResearch = response.research;
            this.selectedResearch = fullResearch;

            // Load datasets for this research
            const datasetsResponse = await this.apiClient.listDatasets(research.id);
            const datasets = datasetsResponse.datasets || [];

            this.renderResearchDetail(fullResearch, datasets);
        } catch (error) {
            console.error('Error loading research details:', error);
            this.showNotification('Error al cargar los detalles de la investigación', 'error');
        }
    }

    renderResearchDetail(research, datasets) {
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

    showNotification(message, type = 'info') {
        // Use existing showError/showSuccess methods
        if (type === 'error') {
            this.showError(message);
        } else if (type === 'success') {
            this.showSuccess(message);
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
