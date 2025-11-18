/**
 * Funciones específicas para el dashboard
 */

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.activeTab = 'resumen';
        this.data = {
            research: [],
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
            await this.loadResearchData();
            await this.loadTabData(this.activeTab);
        } catch (error) {
            console.error('Error loading initial data:', error);
            notify.error('Error cargando datos iniciales');
        }
    }

    async loadResearchData() {
        try {
            // Mostrar estado de carga
            document.getElementById('loadingState').style.display = 'block';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('researchTable').style.display = 'none';

            // Cargar investigaciones del usuario
            const researchData = await apiClient.getResearchByOwner(this.currentUser.username);
            
            this.data.research = [];
            Object.values(researchData).forEach(researches => {
                researches.forEach(research => {
                    this.data.research.push(research);
                });
            });

            // Ocultar estado de carga
            document.getElementById('loadingState').style.display = 'none';

            if (this.data.research.length === 0) {
                // Mostrar estado vacío
                document.getElementById('emptyState').style.display = 'block';
            } else {
                // Mostrar tabla con investigaciones
                document.getElementById('researchTable').style.display = 'block';
                this.renderResearchTable();
            }

        } catch (error) {
            console.error('Error loading research data:', error);
            document.getElementById('loadingState').style.display = 'none';
            notify.error('Error cargando investigaciones');
        }
    }

    renderResearchTable() {
        const tableBody = document.getElementById('researchTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.data.research.forEach(research => {
            const row = document.createElement('tr');
            row.className = 'research-row';
            row.style.cursor = 'pointer';
            row.onclick = () => this.showResearchDetail(research.id);
            
            const formattedDate = new Date(research.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const statusBadge = research.is_active 
                ? '<span class="badge bg-success">Activo</span>'
                : '<span class="badge bg-secondary">Inactivo</span>';

            row.innerHTML = `
                <td>
                    <div class="fw-medium">${research.title}</div>
                    <small class="text-muted">${research.type_research}</small>
                </td>
                <td>${formattedDate}</td>
                <td><span class="badge bg-info">${research.step}</span></td>
                <td>${statusBadge}</td>
            `;

            tableBody.appendChild(row);
        });
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

        // Botón agregar investigación
        const addResearchBtn = document.getElementById('addResearchBtn');
        if (addResearchBtn) {
            addResearchBtn.onclick = () => this.showNewResearchModal();
        }
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
                case 'resumen':
                    // Los datos ya están cargados
                    break;
                case 'perfil':
                    this.loadProfileData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName} data:`, error);
            notify.error(`Error cargando datos de ${tabName}`);
        }
    }

    loadProfileData() {
        // Cargar datos del perfil del usuario
        if (this.currentUser) {
            document.getElementById('profileName').value = this.currentUser.name || '';
            document.getElementById('profileEmail').value = this.currentUser.email || '';
            document.getElementById('profileUsername').value = this.currentUser.username || '';
        }
    }

    async showResearchDetail(researchId) {
        try {
            const research = this.data.research.find(r => r.id === researchId);
            if (!research) {
                notify.error('Investigación no encontrada');
                return;
            }

            const modalBody = document.getElementById('researchDetailBody');
            
            // Formatear criterios de inclusión
            let criteriaHtml = '';
            if (research.criteria_inclusion && research.criteria_inclusion.length > 0) {
                criteriaHtml = research.criteria_inclusion.map(criterion => 
                    `<li class="mb-2">${criterion}</li>`
                ).join('');
            }

            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary mb-3">Información General</h6>
                        <table class="table table-borderless">
                            <tr>
                                <td class="fw-medium text-muted" style="width: 40%;">Título:</td>
                                <td>${research.title}</td>
                            </tr>
                            <tr>
                                <td class="fw-medium text-muted">Tipo:</td>
                                <td><span class="badge bg-primary">${research.type_research}</span></td>
                            </tr>
                            <tr>
                                <td class="fw-medium text-muted">Metodología:</td>
                                <td><span class="badge bg-info">${research.methodology}</span></td>
                            </tr>
                            <tr>
                                <td class="fw-medium text-muted">Estado:</td>
                                <td>
                                    ${research.is_active 
                                        ? '<span class="badge bg-success">Activo</span>' 
                                        : '<span class="badge bg-secondary">Inactivo</span>'}
                                    ${research.is_test 
                                        ? '<span class="badge bg-warning ms-1">Prueba</span>' 
                                        : ''}
                                </td>
                            </tr>
                            <tr>
                                <td class="fw-medium text-muted">Paso actual:</td>
                                <td><span class="badge bg-info">${research.step}</span></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary mb-3">Fechas</h6>
                        <table class="table table-borderless">
                            <tr>
                                <td class="fw-medium text-muted" style="width: 40%;">Creado:</td>
                                <td>${new Date(research.created_at).toLocaleString('es-ES')}</td>
                            </tr>
                            <tr>
                                <td class="fw-medium text-muted">Actualizado:</td>
                                <td>${new Date(research.updated_at).toLocaleString('es-ES')}</td>
                            </tr>
                        </table>
                        
                        <h6 class="fw-bold text-primary mb-3 mt-4">ID de la Investigación</h6>
                        <div class="bg-light p-3 rounded">
                            <small class="font-monospace text-break">${research.id}</small>
                        </div>
                    </div>
                </div>
                
                ${criteriaHtml ? `
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6 class="fw-bold text-primary mb-3">Criterios de Inclusión</h6>
                            <ul class="list-unstyled">
                                ${criteriaHtml}
                            </ul>
                        </div>
                    </div>
                ` : ''}
            `;

            // Configurar botón de editar
            const editBtn = document.getElementById('editResearchBtn');
            editBtn.onclick = () => {
                this.editResearch(researchId);
            };

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('researchDetailModal'));
            modal.show();

        } catch (error) {
            console.error('Error showing research detail:', error);
            notify.error('Error mostrando detalles de la investigación');
        }
    }

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
            await this.loadResearchData();
        } catch (error) {
            notify.error(`Error creando investigación: ${error.message}`);
        }
    }

    async updateProfile() {
        const form = document.getElementById('profileForm');
        const { data } = FormUtils.getFormData(form);
        
        // Validar contraseñas si se proporcionaron
        if (data.password && data.password !== data.password_confirm) {
            notify.error('Las contraseñas no coinciden');
            return;
        }

        try {
            // Preparar datos para actualización
            const updateData = {
                name: data.name,
                email: data.email
            };

            if (data.password) {
                updateData.password = data.password;
            }

            // TODO: Implementar API de actualización de perfil
            notify.info('Funcionalidad de actualización de perfil en desarrollo');
            
        } catch (error) {
            notify.error(`Error actualizando perfil: ${error.message}`);
        }
    }

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

    editResearch(researchId) {
        notify.info(`Editar investigación: ${researchId}`);
        // TODO: Implementar edición
    }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});