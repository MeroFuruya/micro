import { type MiddlewareNextHandler, MiddlewareHook, type Middleware, MIDDLEWARE } from '@micro/middleware';
import { type Context } from '@micro/context';
import { contextHasExpress, contextGetExpressRequest, contextGetExpressResponse } from '@micro/express';
import { defineModule } from '@micro/core';

export class Banana implements Middleware {
  async [MiddlewareHook](context: Context, next: MiddlewareNextHandler) {
    console.log(1)
    if (contextHasExpress(context)) {
      const request = contextGetExpressRequest(context);
      const response = contextGetExpressResponse(context);
      if (request.url === '/ping') {
        response.send("pong");
      } else {
        next(context);
      }
    }
  }
}

export class Banana2 implements Middleware {
  async [MiddlewareHook](context: Context, next: MiddlewareNextHandler) {
    console.log(2)
    if (contextHasExpress(context)) {
      const request = contextGetExpressRequest(context);
      const response = contextGetExpressResponse(context);
      if (request.url === '/ping') {
        response.send("pong2");
      } else {
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