import { Application } from "./application.js";
import type { Module, ProviderInstance, ProviderToken } from "./interface/index.js";
import { ModuleDefinitionStore } from "./moduleDefinition.js";

export async function bootstrapApplication(moduleDefinitionStore: ModuleDefinitionStore, module: Module): Promise<Application> {
  const moduleIssue = moduleDefinitionStore.detectModuleIssue(module);
  if (moduleIssue !== null) {
    throw moduleIssue;
  }

  const application = new Application(moduleDefinitionStore, module);

  const waitingModules = moduleDefinitionStore.getModulesInTree(module);
  while (waitingModules.size > 0) {
    for (const module of waitingModules.values()) {
      const moduleImports = moduleDefinitionStore.getModuleImports(module);
      const allImportsReady = moduleImports.every((moduleImport) => !waitingModules.has(moduleImport));
      if (!allImportsReady) continue;
    }
  }

  return application;
}
