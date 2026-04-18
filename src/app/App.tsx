import { RouterProvider } from "react-router-dom";
import { WebAnalytics } from "../components/WebAnalytics";
import { router } from "./routes";

export function App() {
  return (
    <>
      <WebAnalytics />
      <RouterProvider router={router} />
    </>
  );
}
