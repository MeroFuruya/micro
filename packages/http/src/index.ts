import { defineModule } from "@micro/core";

export interface HttpModuleOptions {
  host?: string;
  port?: number;
}

export function HttpModule(options: HttpModuleOptions) {
  const port = options.port ?? 8080;

  return defineModule({
    name: `HttpModule[${port}]`,
  })
}