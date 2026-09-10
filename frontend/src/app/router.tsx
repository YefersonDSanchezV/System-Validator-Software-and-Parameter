import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { HomePage } from "@/features/home/pages/HomePage";
import { SolicitudPage } from "@/features/solicitud-parametro/pages/SolicitudPage";
import { CoordinatorPage } from "@/features/versions/pages/CoordinatorPage";
import { ValidatorPage } from "@/features/observaciones/pages/ValidatorPage";
import { UsuariosSolicitudLogin, UsuariosSolicitudPortal } from "@/features/auth/UsuariosSolicitudLogin";
import App from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/admin",
    element: <App />,
  },
  {
    path: "/solicitud-usuario/login",
    element: <UsuariosSolicitudLogin />,
  },
  {
    path: "/solicitud-usuario",
    element: <UsuariosSolicitudPortal />,
  },
  // Fase 5 — Nuevas rutas modulares (mantienen /legacy por compatibilidad)
  {
    path: "/coordinator",
    element: <AppLayout />,
    children: [{ index: true, element: <CoordinatorPage /> }, { path: "*", element: <CoordinatorPage /> }],
  },
  {
    path: "/validator",
    element: <AppLayout />,
    children: [{ index: true, element: <ValidatorPage /> }, { path: "*", element: <ValidatorPage /> }],
  },
  {
    path: "/solicitud-parametro",
    element: <AppLayout />,
    children: [{ index: true, element: <SolicitudPage /> }],
  },
  {
    path: "/home",
    element: <AppLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  {
    path: "/legacy",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "solicitud", element: <SolicitudPage /> },
      { path: "coordinator/*", element: <CoordinatorPage /> },
      { path: "validator/*", element: <ValidatorPage /> },
    ],
  },
]);
