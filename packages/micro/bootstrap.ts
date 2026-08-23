import { Application } from "./application.js";
import type { Module } from "./interface/index.js";
import { ModuleDefinitionStore } from "./moduleDefinition.js";

export function bootstrapApplication(module: Module, moduleDefinitionStore?: ModuleDefinitionStore, ): Application {
  moduleDefinitionStore ??= ModuleDefinitionStore.getGlobalModuleStore();
  
  const moduleIssue = moduleDefinitionStore.detectModuleIssue(module);
  if (moduleIssue !== null) {
    throw moduleIssue;
  }
  
  const application = new Application(moduleDefinitionStore);
  application.bootstrap(module);
  return application;
}
