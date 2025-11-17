/**
 * Translation system for the application
 */

class TranslationManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.defaultTranslations = this.getDefaultTranslations();
        this.loadTranslations();
        this.init();
    }

    getDefaultTranslations() {
        return {
            en: {
                // Login page
                'login.subtitle': 'Sign in to your account',
                'login.username': 'Username',
                'login.password': 'Password',
                'login.signin': 'Sign In',
                'login.noAccount': "Don't have an account?",
                'login.signupHere': 'Sign up here',
                'login.signingIn': 'Signing in...',
                'login.welcome': 'Welcome! Redirecting...',
                'login.error': 'Login error',
                'login.connectionError': 'Connection error. Please try again.',
                
                // Register page
                'register.title': 'Create Account',
                'register.subtitle': 'Sign up to access the system',
                'register.username': 'Username',
                'register.name': 'Name',
                'register.email': 'Email Address',
                'register.password': 'Password',
                'register.institution': 'Institution',
                'register.role': 'Role',
                'register.roleResearcher': 'Researcher',
                'register.roleViewer': 'Viewer',
                'register.createAccount': 'Create Account',
                'register.hasAccount': 'Already have an account?',
                'register.signinHere': 'Sign in here',
                'register.creating': 'Creating account...',
                'register.success': 'Account created successfully! Redirecting to login...',
                'register.error': 'Registration error',
                'register.validEmail': 'Please enter a valid email',
                'register.minPassword': 'Password must be at least 4 characters',
                'register.required': 'This field is required',
                
                // Common
                'common.processing': 'Processing...',
                'common.cancel': 'Cancel',
                'common.confirm': 'Confirm',
                'common.save': 'Save',
                'common.delete': 'Delete',
                'common.edit': 'Edit',
                'common.view': 'View',
                'common.loading': 'Loading...',
                'common.error': 'Error',
                'common.success': 'Success',
                'common.warning': 'Warning',
                'common.info': 'Information'
            },
            es: {
                // Login page
                'login.subtitle': 'Inicia sesión en tu cuenta',
                'login.username': 'Usuario',
                'login.password': 'Contraseña',
                'login.signin': 'Iniciar Sesión',
                'login.noAccount': '¿No tienes una cuenta?',
                'login.signupHere': 'Regístrate aquí',
                'login.signingIn': 'Iniciando sesión...',
                'login.welcome': '¡Bienvenido! Redirigiendo...',
                'login.error': 'Error al iniciar sesión',
                'login.connectionError': 'Error de conexión. Por favor intenta de nuevo.',
                
                // Register page
                'register.title': 'Crear Cuenta',
                'register.subtitle': 'Regístrate para acceder al sistema',
                'register.username': 'Usuario',
                'register.name': 'Nombre',
                'register.email': 'Correo Electrónico',
                'register.password': 'Contraseña',
                'register.institution': 'Institución',
                'register.role': 'Rol',
                'register.roleResearcher': 'Investigador',
                'register.roleViewer': 'Visualizador',
                'register.createAccount': 'Crear Cuenta',
                'register.hasAccount': '¿Ya tienes una cuenta?',
                'register.signinHere': 'Inicia sesión aquí',
                'register.creating': 'Creando cuenta...',
                'register.success': '¡Cuenta creada exitosamente! Redirigiendo al login...',
                'register.error': 'Error al crear la cuenta',
                'register.validEmail': 'Por favor ingresa un email válido',
                'register.minPassword': 'La contraseña debe tener al menos 4 caracteres',
                'register.required': 'Este campo es requerido',
                
                // Common
                'common.processing': 'Procesando...',
                'common.cancel': 'Cancelar',
                'common.confirm': 'Confirmar',
                'common.save': 'Guardar',
                'common.delete': 'Eliminar',
                'common.edit': 'Editar',
                'common.view': 'Ver',
                'common.loading': 'Cargando...',
                'common.error': 'Error',
                'common.success': 'Éxito',
                'common.warning': 'Advertencia',
                'common.info': 'Información'
            },
            fr: {
                // Login page
                'login.subtitle': 'Connectez-vous à votre compte',
                'login.username': 'Nom d\'utilisateur',
                'login.password': 'Mot de passe',
                'login.signin': 'Se connecter',
                'login.noAccount': 'Vous n\'avez pas de compte?',
                'login.signupHere': 'Inscrivez-vous ici',
                'login.signingIn': 'Connexion en cours...',
                'login.welcome': 'Bienvenue! Redirection...',
                'login.error': 'Erreur de connexion',
                'login.connectionError': 'Erreur de connexion. Veuillez réessayer.',
                
                // Register page
                'register.title': 'Créer un Compte',
                'register.subtitle': 'Inscrivez-vous pour accéder au système',
                'register.username': 'Nom d\'utilisateur',
                'register.name': 'Nom',
                'register.email': 'Adresse e-mail',
                'register.password': 'Mot de passe',
                'register.institution': 'Institution',
                'register.role': 'Rôle',
                'register.roleResearcher': 'Chercheur',
                'register.roleViewer': 'Visualisateur',
                'register.createAccount': 'Créer un Compte',
                'register.hasAccount': 'Vous avez déjà un compte?',
                'register.signinHere': 'Connectez-vous ici',
                'register.creating': 'Création du compte...',
                'register.success': 'Compte créé avec succès! Redirection vers la connexion...',
                'register.error': 'Erreur d\'inscription',
                'register.validEmail': 'Veuillez entrer un e-mail valide',
                'register.minPassword': 'Le mot de passe doit contenir au moins 4 caractères',
                'register.required': 'Ce champ est obligatoire',
                
                // Common
                'common.processing': 'Traitement...',
                'common.cancel': 'Annuler',
                'common.confirm': 'Confirmer',
                'common.save': 'Sauvegarder',
                'common.delete': 'Supprimer',
                'common.edit': 'Modifier',
                'common.view': 'Voir',
                'common.loading': 'Chargement...',
                'common.error': 'Erreur',
                'common.success': 'Succès',
                'common.warning': 'Avertissement',
                'common.info': 'Information'
            },
            pt: {
                // Login page
                'login.subtitle': 'Faça login em sua conta',
                'login.username': 'Usuário',
                'login.password': 'Senha',
                'login.signin': 'Entrar',
                'login.noAccount': 'Não tem uma conta?',
                'login.signupHere': 'Cadastre-se aqui',
                'login.signingIn': 'Entrando...',
                'login.welcome': 'Bem-vindo! Redirecionando...',
                'login.error': 'Erro no login',
                'login.connectionError': 'Erro de conexão. Tente novamente.',
                
                // Register page
                'register.title': 'Criar Conta',
                'register.subtitle': 'Cadastre-se para acessar o sistema',
                'register.username': 'Usuário',
                'register.name': 'Nome',
                'register.email': 'Endereço de E-mail',
                'register.password': 'Senha',
                'register.institution': 'Instituição',
                'register.role': 'Função',
                'register.roleResearcher': 'Pesquisador',
                'register.roleViewer': 'Visualizador',
                'register.createAccount': 'Criar Conta',
                'register.hasAccount': 'Já tem uma conta?',
                'register.signinHere': 'Entre aqui',
                'register.creating': 'Criando conta...',
                'register.success': 'Conta criada com sucesso! Redirecionando para login...',
                'register.error': 'Erro no cadastro',
                'register.validEmail': 'Por favor digite um e-mail válido',
                'register.minPassword': 'A senha deve ter pelo menos 4 caracteres',
                'register.required': 'Este campo é obrigatório',
                
                // Common
                'common.processing': 'Processando...',
                'common.cancel': 'Cancelar',
                'common.confirm': 'Confirmar',
                'common.save': 'Salvar',
                'common.delete': 'Excluir',
                'common.edit': 'Editar',
                'common.view': 'Ver',
                'common.loading': 'Carregando...',
                'common.error': 'Erro',
                'common.success': 'Sucesso',
                'common.warning': 'Aviso',
                'common.info': 'Informação'
            }
        };
    }

    init() {
        // Load saved language preference
        this.currentLanguage = localStorage.getItem('language') || this.detectBrowserLanguage();
        this.createLanguageSelector();
        this.translatePage();
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        // Return supported language or default to English
        return this.translations[langCode] || this.defaultTranslations[langCode] ? langCode : 'en';
    }

    createLanguageSelector() {
        // Check if selector already exists
        if (document.getElementById('language-selector')) return;

        const selector = document.createElement('div');
        selector.id = 'language-selector';
        selector.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 10px;
        `;

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';
        select.style.cssText = 'border: none; min-width: 120px;';
        
        const languages = [
            { code: 'en', name: '🇺🇸 English', flag: '🇺🇸' },
            { code: 'es', name: '🇪🇸 Español', flag: '🇪🇸' },
            { code: 'fr', name: '🇫🇷 Français', flag: '🇫🇷' },
            { code: 'pt', name: '🇧🇷 Português', flag: '🇧🇷' }
        ];

        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            option.selected = lang.code === this.currentLanguage;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        selector.appendChild(select);
        document.body.appendChild(selector);
    }

    loadTranslations() {
        // In a real app, you might load from an API
        // For now, use default translations
        this.translations = this.defaultTranslations;
    }

    setLanguage(langCode) {
        this.currentLanguage = langCode;
        localStorage.setItem('language', langCode);
        this.translatePage();
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-translate]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key);
            
            if (translation) {
                element.textContent = translation;
            }
        });

        // Update placeholders
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = this.getTranslation(key);
            
            if (translation) {
                element.setAttribute('placeholder', translation);
            }
        });

        // Update titles
        const titleElements = document.querySelectorAll('[data-translate-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-translate-title');
            const translation = this.getTranslation(key);
            
            if (translation) {
                element.setAttribute('title', translation);
            }
        });
    }

    getTranslation(key, language = null) {
        const lang = language || this.currentLanguage;
        return this.translations[lang] && this.translations[lang][key] 
            ? this.translations[lang][key] 
            : this.translations['en'][key] || key;
    }

    // Helper method for JavaScript code
    t(key, language = null) {
        return this.getTranslation(key, language);
    }

    // Add new translations dynamically
    addTranslations(language, translations) {
        if (!this.translations[language]) {
            this.translations[language] = {};
        }
        
        Object.assign(this.translations[language], translations);
        
        // Retranslate if current language
        if (this.currentLanguage === language) {
            this.translatePage();
        }
    }

    // Get all available languages
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Initialize translation manager
window.translator = new TranslationManager();

// Export for use in other files
window.TranslationManager = TranslationManager;