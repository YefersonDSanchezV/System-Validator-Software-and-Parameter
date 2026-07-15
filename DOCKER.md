# Despliegue con Docker

El proyecto se publica como dos servicios: el frontend en Nginx y la API FastAPI.
Nginx redirige las llamadas a `/api/*` al contenedor backend, por lo que el navegador
no necesita conocer la dirección interna del servicio.

## Preparación

1. Cree `backend/.env` a partir de `backend/.env.example` y configure las credenciales
   de PostgreSQL. El servidor indicado en `DB_HOST` debe ser accesible desde Docker.
   Para una base de datos en el equipo anfitrión, use `host.docker.internal`.
2. Desde la raíz del proyecto ejecute:

```powershell
docker compose up --build -d
```

## Accesos

- Aplicación: `http://localhost:8080`
- API y documentación Swagger: `http://localhost:8000/docs`
- Comprobación: `http://localhost:8000/health`

Puede cambiar los puertos antes de iniciar: `FRONTEND_PORT=80 BACKEND_PORT=8000 docker compose up -d`.

## Operación

```powershell
docker compose logs -f
docker compose down
```

La composición no crea ni elimina la base de datos: utiliza la instancia PostgreSQL
configurada en `backend/.env` y preserva los datos existentes.
