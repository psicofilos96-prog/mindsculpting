import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/stroop")({
  component: () => <Outlet />,
});
