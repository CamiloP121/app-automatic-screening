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
        
        // Load researches
        this.loadResearches();
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

        // If switching to summary, ensure we're showing the list view
        if (viewName === 'summary') {
            this.showResearchList();
        }
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

            const response = await this.apiClient.makeRequest('/research/get-research', {
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

    showResearchDetail(research) {
        this.selectedResearch = research;
        this.currentView = 'detail';

        const listView = document.getElementById('researchListView');
        const detailView = document.getElementById('researchDetailView');
        const detailContent = document.getElementById('researchDetailContent');

        listView.style.display = 'none';
        detailView.style.display = 'block';

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
        if (research.criteria_inclusion) {
            const criteria = research.criteria_inclusion.split('|&|');
            criteriaHtml = '<ul class="criteria-list">';
            criteria.forEach(criterion => {
                criteriaHtml += `<li>${this.escapeHtml(criterion)}</li>`;
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
        // TODO: Implement create functionality
        alert('Funcionalidad de creación en desarrollo. Redireccionar a formulario de creación.');
    }

    logout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.apiClient.logout();
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
