import { Application } from "./application.js";
import type { Module } from "./interface/index.js";
import { buildModuleDefinitionStore, globalModuleMap, type ModuleDefinitionMap } from "./definition.js";

export function bootstrapApplication(module: Module, moduleMap?: ModuleDefinitionMap): Application {
  moduleMap ??= globalModuleMap;

  const moduleStore = buildModuleDefinitionStore(moduleMap, module);
  
  const application = new Application(moduleStore);
  application.bootstrap();
  return application;
}
