import { type Context } from '@micro/context';
import { defineModule } from '@micro/core';
import { contextGetExpressRequest, contextGetExpressResponse, contextHasExpress } from '@micro/express';
import { type Middleware, type MiddlewareNextHandler, MIDDLEWARE, MiddlewareHook } from '@micro/middleware';

export class Banana implements Middleware {
  async [MiddlewareHook](context: Context, next: MiddlewareNextHandler) {
    if (contextHasExpress(context)) {
      const request = contextGetExpressRequest(context);
      const response = contextGetExpressResponse(context);
      if (request.url === '/ping') {
        response.write("pong");
        await next(context);
        if (response.headersSent) {
          response.send()
        }
      }
    }
  }
}

const BananaModule = defineModule({
  name: 'banana',
  provide: [
    {
      for: MIDDLEWARE,
      useClass: Banana,
    },
  ],
  export: [MIDDLEWARE],
})

export class Banana2 implements Middleware {
  async [MiddlewareHook](context: Context, next: MiddlewareNextHandler) {
    if (contextHasExpress(context)) {
      const request = contextGetExpressRequest(context);
      const response = contextGetExpressResponse(context);
      if (request.url === '/ping') {
        response.write("pong2");
        next(context);
      }
    }
  }
}

const Banana2Module = defineModule({
  name: 'banana2',
  provide: [
    {
      for: MIDDLEWARE,
      useClass: Banana2,
    },
  ],
  export: [MIDDLEWARE],
})

export const MyMiddlewareModule = defineModule({
  name: 'banana',
  import: [BananaModule, Banana2Module],
  export: [Banana2Module, BananaModule],
})