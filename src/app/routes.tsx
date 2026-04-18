import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../components/Layout";
import { AdminImportPage } from "../pages/AdminImportPage";
import { ItinerariesPage } from "../pages/ItinerariesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TimelinePage } from "../pages/TimelinePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <TimelinePage />,
      },
      {
        path: "itineraries",
        element: <ItinerariesPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "admin/import",
        element: <AdminImportPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
