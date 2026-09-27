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
        response.write("pong\n");
        await next(context);
        if (response.headersSent) {
          response.send()
        }
      }
    }
  }
}

export class Banana2 implements Middleware {
  async [MiddlewareHook](context: Context, next: MiddlewareNextHandler) {
    if (contextHasExpress(context)) {
      const request = contextGetExpressRequest(context);
      const response = contextGetExpressResponse(context);
      if (request.url === '/ping') {
        response.write("pong2\n");
        next(context);
      }
    }
  }
}

export const BananaModule = defineModule({
  name: 'banana',
  provide: [
    {
      for: MIDDLEWARE,
      useClass: Banana,
    },
    {
      for: MIDDLEWARE,
      useClass: Banana2,
    },
  ],
  export: [MIDDLEWARE],
})