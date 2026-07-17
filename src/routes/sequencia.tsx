import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sequencia")({
  component: () => <Outlet />,
});
