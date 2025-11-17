/**
 * Utilidades comunes para la interfaz
 */

// === SISTEMA DE NOTIFICACIONES ===

class NotificationManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.style.cssText = `
            margin-bottom: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <i class="${iconMap[type] || iconMap.info} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.container.appendChild(notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// === UTILIDADES DE FORMULARIO ===

class FormUtils {
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return { formData, data };
    }

    static setButtonLoading(button, loading = true, originalText = null) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';
            button.disabled = true;
        } else {
            button.innerHTML = originalText || button.dataset.originalText || button.innerHTML;
            button.disabled = false;
        }
    }

    static validateRequired(formElement) {
        const requiredFields = formElement.querySelectorAll('[required]');
        const errors = [];

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.getAttribute('name')} es requerido`);
                field.classList.add('is-invalid');
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return errors;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// === UTILIDADES DE TIEMPO ===

class TimeUtils {
    static formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('es-ES');
    }

    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    static timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        const intervals = {
            año: 31536000,
            mes: 2592000,
            semana: 604800,
            día: 86400,
            hora: 3600,
            minuto: 60
        };

        for (let [unit, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `hace ${interval} ${unit}${interval > 1 ? 's' : ''}`;
            }
        }

        return 'hace un momento';
    }
}

// === UTILIDADES DE ARCHIVO ===

class FileUtils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.type) || allowedTypes.some(type => 
            file.name.toLowerCase().endsWith(type.replace('*', ''))
        );
    }

    static createFileInput(callback, accept = '*') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && callback) {
                callback(file);
            }
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    }
}

// === UTILIDADES DE TABLA ===

class TableUtils {
    static createTable(data, columns, options = {}) {
        const { 
            className = 'table table-striped table-hover',
            pagination = false,
            pageSize = 10,
            searchable = false
        } = options;

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';

        const table = document.createElement('table');
        table.className = className;

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title || column.key;
            if (column.sortable) {
                th.style.cursor = 'pointer';
                th.onclick = () => this.sortTable(table, column.key);
            }
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        this.populateTableBody(tbody, data, columns);
        table.appendChild(tbody);

        tableContainer.appendChild(table);
        return tableContainer;
    }

    static populateTableBody(tbody, data, columns) {
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                
                if (column.render) {
                    td.innerHTML = column.render(item[column.key], item);
                } else {
                    td.textContent = item[column.key] || '';
                }
                
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
    }
}

// === UTILIDADES DE MODAL ===

class ModalUtils {
    static create(title, content, options = {}) {
        const { 
            size = 'modal-lg',
            closable = true,
            footerButtons = []
        } = options;

        const modalId = 'modal-' + Date.now();
        
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog ${size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            ${closable ? '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' : ''}
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        ${footerButtons.length > 0 ? `
                            <div class="modal-footer">
                                ${footerButtons.map(btn => `
                                    <button type="button" class="btn btn-${btn.type || 'secondary'}" ${btn.dismiss ? 'data-bs-dismiss="modal"' : ''}>
                                        ${btn.text}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        
        // Cleanup after hide
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId).remove();
        });

        return modal;
    }

    static confirm(message, title = 'Confirmación') {
        return new Promise((resolve) => {
            const modal = this.create(title, `<p>${message}</p>`, {
                footerButtons: [
                    { text: 'Cancelar', type: 'secondary', dismiss: true },
                    { text: 'Confirmar', type: 'primary' }
                ]
            });

            const modalElement = document.querySelector('.modal:last-child');
            
            modalElement.querySelector('.btn-primary').onclick = () => {
                modal.hide();
                resolve(true);
            };
            
            modalElement.querySelector('.btn-secondary').onclick = () => {
                modal.hide();
                resolve(false);
            };

            modal.show();
        });
    }
}

// === CREAR INSTANCIAS GLOBALES ===

window.notify = new NotificationManager();
window.FormUtils = FormUtils;
window.TimeUtils = TimeUtils;
window.FileUtils = FileUtils;
window.TableUtils = TableUtils;
window.ModalUtils = ModalUtils;