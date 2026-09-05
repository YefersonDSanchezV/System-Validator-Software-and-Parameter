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
