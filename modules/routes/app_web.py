# Web interface routes
from fastapi import APIRouter, Request, FastAPI
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Configurar templates y archivos estáticos
web_dir = Path(__file__).parent.parent.parent / "web"
template_dir = web_dir / "templates"
static_dir = web_dir / "static"

templates = Jinja2Templates(directory=str(template_dir))

app_web = APIRouter()

# Función para montar archivos estáticos
def mount_static_files(app: FastAPI):
    """Monta los archivos estáticos en la aplicación FastAPI."""
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app_web = APIRouter()

@app_web.get("/", response_class=HTMLResponse, summary="Página principal")
async def root(request: Request):
    """Redirige a la página de login."""
    return RedirectResponse(url="/login")

@app_web.get("/login", response_class=HTMLResponse, summary="Página de login")
async def login_page(request: Request):
    """Muestra la página de login."""
    return templates.TemplateResponse("login.html", {"request": request})

@app_web.get("/register", response_class=HTMLResponse, summary="Página de registro")
async def register_page(request: Request):
    """Muestra la página de registro."""
    return templates.TemplateResponse("register.html", {"request": request})

@app_web.get("/dashboard", response_class=HTMLResponse, summary="Dashboard principal")
async def dashboard_page(request: Request):
    """Muestra el dashboard principal."""
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app_web.get("/logout", summary="Cerrar sesión")
async def logout():
    """Cerrar sesión y redirigir al login."""
    response = RedirectResponse(url="/login")
    response.delete_cookie("user_session")
    return response