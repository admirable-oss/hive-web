type InstallationLogAction =
  | "command_copied"
  | "documentation_opened"
  | "installation_opened";

export function logInstallationAction(action: InstallationLogAction) {
  window.posthog?.logger?.info("installation action completed", {
    action,
  });
}
