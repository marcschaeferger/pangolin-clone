export class NavigationGuard {
  private static instance: NavigationGuard;
  private hasUnsavedChanges = false;
  private warningMessage = "You have unsaved changes. Are you sure you want to leave?";

  private constructor() {}

  static getInstance(): NavigationGuard {
    if (!NavigationGuard.instance) {
      NavigationGuard.instance = new NavigationGuard();
    }
    return NavigationGuard.instance;
  }

  setHasUnsavedChanges(state: boolean) {
    this.hasUnsavedChanges = state;
  }

  getHasUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  setWarningMessage(message: string) {
    this.warningMessage = message;
  }

  getWarningMessage(): string {
    return this.warningMessage;
  }

  clearUnsavedChanges() {
    this.hasUnsavedChanges = false;
  }
}