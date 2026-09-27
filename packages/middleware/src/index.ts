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

  private readonly middlewares = [...this.injector.getAll(MIDDLEWARE, InjectorStrategy.ImportedExported)].reverse();

  async handle(context: Context, next?: (...args: any) => unknown | Promise<unknown>): Promise<unknown> {
    let nextHandler: MiddlewareNextHandler;
    if (next !== undefined) {
      nextHandler = async () => next!();
    } else {
      nextHandler = (() => new Promise((resolve) => resolve(undefined))); // noop
    }

    for (const middleware of this.middlewares) {
      // TODO: Don't just silently skip
      if (typeof middleware !== 'object') {
        this.logger.warn({ msg: 'Middleware instance is not an object, skipping', middleware });
        continue;
      }
      
      if (middleware === null) {
        this.logger.warn({ msg: 'Middleware instance is of type null, skipping', middleware });
        continue;
      }
      
      if (Object.hasOwn(middleware, MiddlewareHook)) {
        this.logger.warn({ msg: 'Middleware does not implement MiddlewareHook, skipping', name: middleware.constructor.name });
        continue;
      }
      const previousHandler = nextHandler;

      nextHandler = function (context) {
        return (middleware as Middleware)[MiddlewareHook](context, previousHandler);
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