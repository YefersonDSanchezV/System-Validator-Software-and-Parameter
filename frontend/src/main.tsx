
  import { createRoot } from "react-dom/client";
  import { RouterProvider } from "react-router";
  import { router } from "./app/router.tsx";
  import { Providers } from "./app/providers.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
  