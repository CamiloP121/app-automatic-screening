/**
 * Funciones específicas para el dashboard
 */

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.activeTab = 'overview';
        this.data = {
            research: [],
            articles: [],
            models: [],
            stats: {}
        };
        
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!apiClient.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        this.currentUser = apiClient.getCurrentUser();
        this.setupUI();
        await this.loadInitialData();
        this.setupEventListeners();
    }

    setupUI() {
        // Mostrar nombre de usuario
        const usernameElement = document.getElementById('username');
        if (usernameElement) {
            usernameElement.textContent = this.currentUser.name || this.currentUser.username;
        }

        // Iniciar reloj
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    async loadInitialData() {
        try {
            await this.loadStats();
            await this.loadTabData(this.activeTab);
        } catch (error) {
            console.error('Error loading initial data:', error);
            notify.error('Error cargando datos iniciales');
        }
    }

    async loadStats() {
        try {
            // Cargar estadísticas de investigaciones
            const researchData = await apiClient.getResearchByOwner(this.currentUser.username);
            
            let researchCount = 0;
            this.data.research = [];
            
            Object.values(researchData).forEach(researches => {
                researches.forEach(research => {
                    this.data.research.push(research);
                    researchCount++;
                });
            });

            // Actualizar contadores en el dashboard
            this.updateCounter('researchCount', researchCount);
            
            // TODO: Implementar carga de estadísticas adicionales
            this.updateCounter('articlesCount', 0);
            this.updateCounter('labeledCount', 0);
            this.updateCounter('modelsCount', 0);

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    setupEventListeners() {
        // Navegación de tabs
        document.querySelectorAll('[data-tab]').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const tabName = link.dataset.tab;
                await this.switchTab(tabName);
            });
        });

        // Botón de logout
        const logoutBtn = document.querySelector('a[onclick="logout()"]');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                this.logout();
            };
        }

        // Event listeners para botones de acción
        this.setupActionButtons();
    }

    setupActionButtons() {
        // Botón nueva investigación
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn[data-action="new-research"]')) {
                this.showNewResearchModal();
            }
            
            if (e.target.closest('.btn[data-action="upload-articles"]')) {
                this.showUploadArticlesModal();
            }
            
            if (e.target.closest('.btn[data-action="train-model"]')) {
                this.showTrainModelModal();
            }
        });
    }

    async switchTab(tabName) {
        // Actualizar UI
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
        document.getElementById(`${tabName}-tab`).style.display = 'block';
        
        // Cargar datos del tab
        this.activeTab = tabName;
        await this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'research':
                    await this.loadResearchData();
                    break;
                case 'articles':
                    await this.loadArticlesData();
                    break;
                case 'models':
                    await this.loadModelsData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName} data:`, error);
            notify.error(`Error cargando datos de ${tabName}`);
        }
    }

    async loadOverviewData() {
        const activityContainer = document.getElementById('recentActivity');
        if (activityContainer) {
            const activities = [
                { icon: 'fas fa-plus-circle', text: 'Nueva investigación creada', time: new Date() },
                { icon: 'fas fa-upload', text: 'Artículos cargados', time: new Date(Date.now() - 86400000) },
                { icon: 'fas fa-brain', text: 'Modelo entrenado', time: new Date(Date.now() - 172800000) }
            ];

            activityContainer.innerHTML = activities.map(activity => `
                <div class="list-group-item d-flex align-items-center">
                    <i class="${activity.icon} me-3 text-primary"></i>
                    <div class="flex-grow-1">
                        <div class="fw-medium">${activity.text}</div>
                        <small class="text-muted">${TimeUtils.timeAgo(activity.time)}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    async loadResearchData() {
        const container = document.getElementById('researchList');
        if (!container) return;

        if (this.data.research.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5>No hay investigaciones</h5>
                    <p class="text-muted">Crea tu primera investigación para comenzar</p>
                    <button class="btn btn-primary" data-action="new-research">
                        <i class="fas fa-plus me-1"></i>Nueva Investigación
                    </button>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'title', title: 'Título' },
            { key: 'type_research', title: 'Tipo' },
            { key: 'created_at', title: 'Creado', render: (value) => TimeUtils.formatDate(value) },
            { 
                key: 'is_active', 
                title: 'Estado',
                render: (value) => `<span class="badge bg-${value ? 'success' : 'secondary'}">${value ? 'Activo' : 'Inactivo'}</span>`
            },
            {
                key: 'actions',
                title: 'Acciones',
                render: (value, item) => `
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="dashboard.viewResearch('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="dashboard.editResearch('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                `
            }
        ];

        const table = TableUtils.createTable(this.data.research, columns, {
            searchable: true,
            pagination: true
        });

        container.innerHTML = '';
        container.appendChild(table);
    }

    async loadArticlesData() {
        const container = document.getElementById('articlesList');
        if (container) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <h5>Gestión de Artículos</h5>
                    <p class="text-muted">Carga y administra artículos para tus investigaciones</p>
                    <button class="btn btn-primary" data-action="upload-articles">
                        <i class="fas fa-upload me-1"></i>Cargar Artículos
                    </button>
                </div>
            `;
        }
    }

    async loadModelsData() {
        const container = document.getElementById('modelsList');
        if (container) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-brain fa-3x text-muted mb-3"></i>
                    <h5>Modelos de Machine Learning</h5>
                    <p class="text-muted">Entrena y gestiona modelos de clasificación</p>
                    <button class="btn btn-primary" data-action="train-model">
                        <i class="fas fa-cogs me-1"></i>Entrenar Modelo
                    </button>
                </div>
            `;
        }
    }

    // === MODALES ===

    showNewResearchModal() {
        const modalContent = `
            <form id="newResearchForm">
                <div class="mb-3">
                    <label for="researchTitle" class="form-label">Título de la Investigación</label>
                    <input type="text" class="form-control" id="researchTitle" name="title" required>
                </div>
                <div class="mb-3">
                    <label for="researchType" class="form-label">Tipo de Investigación</label>
                    <select class="form-control" id="researchType" name="type_research" required>
                        <option value="">Seleccionar tipo</option>
                        <option value="PICO">PICO</option>
                        <option value="systematic_review">Revisión Sistemática</option>
                        <option value="meta_analysis">Meta-análisis</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="researchMethodology" class="form-label">Metodología</label>
                    <select class="form-control" id="researchMethodology" name="methodology">
                        <option value="Partial">Parcial</option>
                        <option value="Full">Completa</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="criteriaInclusion" class="form-label">Criterios de Inclusión</label>
                    <textarea class="form-control" id="criteriaInclusion" name="criteria_inclusion" rows="3" 
                              placeholder="Separar criterios con |&|"></textarea>
                </div>
            </form>
        `;

        const modal = ModalUtils.create('Nueva Investigación', modalContent, {
            footerButtons: [
                { text: 'Cancelar', type: 'secondary', dismiss: true },
                { text: 'Crear Investigación', type: 'primary' }
            ]
        });

        const modalElement = document.querySelector('.modal:last-child');
        modalElement.querySelector('.btn-primary').onclick = async () => {
            await this.submitNewResearch(modal);
        };

        modal.show();
    }

    async submitNewResearch(modal) {
        const form = document.getElementById('newResearchForm');
        const { formData, data } = FormUtils.getFormData(form);
        
        const errors = FormUtils.validateRequired(form);
        if (errors.length > 0) {
            notify.error(errors[0]);
            return;
        }

        try {
            data.username = this.currentUser.username;
            data.is_active = true;
            data.is_test = false;

            const result = await apiClient.createResearch(data);
            notify.success('Investigación creada exitosamente');
            modal.hide();
            
            // Recargar datos
            await this.loadStats();
            if (this.activeTab === 'research') {
                await this.loadResearchData();
            }
        } catch (error) {
            notify.error(`Error creando investigación: ${error.message}`);
        }
    }

    showUploadArticlesModal() {
        const modalContent = `
            <form id="uploadArticlesForm">
                <div class="mb-3">
                    <label for="researchSelect" class="form-label">Seleccionar Investigación</label>
                    <select class="form-control" id="researchSelect" name="research_id" required>
                        <option value="">Seleccionar investigación</option>
                        ${this.data.research.map(r => `<option value="${r.id}">${r.title}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-3">
                    <label for="articlesFile" class="form-label">Archivo de Artículos (CSV/JSON)</label>
                    <input type="file" class="form-control" id="articlesFile" name="file" 
                           accept=".csv,.json" required>
                    <div class="form-text">Formatos soportados: CSV, JSON</div>
                </div>
            </form>
        `;

        const modal = ModalUtils.create('Cargar Artículos', modalContent, {
            footerButtons: [
                { text: 'Cancelar', type: 'secondary', dismiss: true },
                { text: 'Cargar Artículos', type: 'primary' }
            ]
        });

        const modalElement = document.querySelector('.modal:last-child');
        modalElement.querySelector('.btn-primary').onclick = async () => {
            await this.submitUploadArticles(modal);
        };

        modal.show();
    }

    async submitUploadArticles(modal) {
        const form = document.getElementById('uploadArticlesForm');
        const { data } = FormUtils.getFormData(form);
        const file = form.file.files[0];
        
        const errors = FormUtils.validateRequired(form);
        if (errors.length > 0) {
            notify.error(errors[0]);
            return;
        }

        if (!file) {
            notify.error('Por favor selecciona un archivo');
            return;
        }

        try {
            const result = await apiClient.uploadData(
                this.currentUser.username, 
                data.research_id, 
                file
            );
            notify.success('Artículos cargados exitosamente');
            modal.hide();
        } catch (error) {
            notify.error(`Error cargando artículos: ${error.message}`);
        }
    }

    showTrainModelModal() {
        // Similar al modal de upload articles pero para entrenar modelos
        notify.info('Funcionalidad de entrenamiento de modelos en desarrollo');
    }

    // === UTILIDADES ===

    updateTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString('es-ES');
        }
    }

    async logout() {
        const confirmed = await ModalUtils.confirm('¿Estás seguro de que quieres cerrar sesión?');
        if (confirmed) {
            apiClient.logout();
        }
    }

    viewResearch(researchId) {
        notify.info(`Ver detalles de investigación: ${researchId}`);
        // TODO: Implementar vista de detalles
    }

    editResearch(researchId) {
        notify.info(`Editar investigación: ${researchId}`);
        // TODO: Implementar edición
    }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});