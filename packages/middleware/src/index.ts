import { type Context } from '@micro/context';
import { defineModule, inject, Injector, InjectorStrategy, type Module, type ProviderToken } from '@micro/core';
import { injectLogger } from '@micro/logging';

export const MiddlewareHook = Symbol('MiddlewareHook');

export interface MiddlewareNextHandler {
  (context: Context): Promise<unknown>;
}

export interface Middleware {
  [MiddlewareHook](context: Context, next: MiddlewareNextHandler): Promise<unknown>;
}

export const MIDDLEWARE: ProviderToken = Symbol("Middleware");

export class MiddlewareHelper {
  private readonly injector = inject(Injector);
  private readonly logger = injectLogger();

  async handle(context: Context, next?: (...args: any) => unknown | Promise<unknown>): Promise<unknown> {
    let nextHandler: MiddlewareNextHandler;
    if (next !== undefined) {
      nextHandler = async () => next!();
    } else {
      nextHandler = (() => new Promise((resolve) => resolve(undefined)));
    }

    for (const middleware of this.injector.getAll(MIDDLEWARE, InjectorStrategy.ImportedExported)) {
      // TODO: Don't just silently skip
      if (typeof middleware !== 'object') continue;
      if (middleware === null) continue;
      if (Object.hasOwn(middleware, MiddlewareHook)) continue;

      nextHandler = function (context) {
        return (middleware as Middleware)[MiddlewareHook](context, nextHandler);
      }
    }
    return nextHandler(context);
  }
}

export function MiddlewareModule(imports: ReadonlyArray<Module>) {
  return defineModule({
    name: "MiddlewareModule",
    import: imports,
    provide: [MiddlewareHelper],
    export: [MiddlewareHelper],
  })
}