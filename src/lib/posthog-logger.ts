type InstallationLogAction =
  | "command_copied"
  | "documentation_opened"
  | "installation_opened"
  | "get_started_opened"
  | "desktop_download_opened";

export function logInstallationAction(action: InstallationLogAction) {
  window.posthog?.logger?.info("installation action completed", {
    action,
  });
}
