/**
 * Funcionalidad específica para páginas de autenticación
 */

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Si ya está autenticado, redirigir al dashboard
        if (apiClient.isAuthenticated() && window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Form de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Validación en tiempo real
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // Validación de email
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.addEventListener('blur', () => {
                if (emailField.value && !FormUtils.validateEmail(emailField.value)) {
                    emailField.classList.add('is-invalid');
                    this.showFieldError(emailField, translator.t('register.validEmail'));
                } else {
                    emailField.classList.remove('is-invalid');
                    this.hideFieldError(emailField);
                }
            });
        }

        // Validación de contraseña
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('blur', () => {
                if (passwordField.value && passwordField.value.length < 4) {
                    passwordField.classList.add('is-invalid');
                    this.showFieldError(passwordField, translator.t('register.minPassword'));
                } else {
                    passwordField.classList.remove('is-invalid');
                    this.hideFieldError(passwordField);
                }
            });
        }
    }

    showFieldError(field, message) {
        this.hideFieldError(field); // Limpiar error previo
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        errorDiv.id = field.id + '-error';
        
        field.parentNode.appendChild(errorDiv);
    }

    hideFieldError(field) {
        const existingError = document.getElementById(field.id + '-error');
        if (existingError) {
            existingError.remove();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const { formData, data } = FormUtils.getFormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Validar campos requeridos
        const errors = FormUtils.validateRequired(form);
        if (errors.length > 0) {
            notify.error(translator.t('login.error') + ': ' + translator.t('register.required'));
            return;
        }

        // Mostrar loading
        FormUtils.setButtonLoading(submitButton, true);
        
        try {
            const result = await apiClient.login(data.username, data.password);
            
            notify.success(translator.t('login.welcome'));
            
            // Redirigir después de un breve delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
            
        } catch (error) {
            notify.error(translator.t('login.error') + ': ' + error.message);
        } finally {
            FormUtils.setButtonLoading(submitButton, false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const { formData, data } = FormUtils.getFormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Validar campos requeridos
        const errors = FormUtils.validateRequired(form);
        if (errors.length > 0) {
            notify.error(translator.t('register.error') + ': ' + translator.t('register.required'));
            return;
        }

        // Validar email
        if (!FormUtils.validateEmail(data.email)) {
            notify.error(translator.t('register.validEmail'));
            return;
        }

        // Validar contraseña
        if (data.password.length < 4) {
            notify.error(translator.t('register.minPassword'));
            return;
        }

        // Mostrar loading
        FormUtils.setButtonLoading(submitButton, true);
        
        try {
            const result = await apiClient.register(data);
            
            notify.success(translator.t('register.success'));
            
            // Redirigir después de un breve delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
        } catch (error) {
            notify.error(translator.t('register.error') + ': ' + error.message);
        } finally {
            FormUtils.setButtonLoading(submitButton, false);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});