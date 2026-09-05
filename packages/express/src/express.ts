import { defineModule, inject, Injector, InjectorStrategy, type Module, type ApplicationStartHook, type ApplicationStopHook } from '@micro/core';
import { injectLogger } from '@micro/logging';
import express, { type Application, type RequestHandler } from 'express';
import type { Server } from 'http';

export const EXPRESS_OPTIONS = Symbol('EXPRESS_OPTIONS')
export const EXPRESS_HANDLER = Symbol('EXPRESS_HANDLER')

export interface ExpressOptions {
  listen?: {
    host?: string;
    port?: number;
  };
  set?: Record<string, boolean | number | string>;
}

export interface ExpressHandler {
  handle: RequestHandler;
}

function getDefaultOptions(options?: ExpressOptions) {
  return {
    listen: {
      host: options?.listen?.host ?? 'localhost',
      port: options?.listen?.port ?? 8080,
    },
    set: options?.set ?? {},
  } satisfies ExpressOptions;
}

export class ExpressServer implements ApplicationStartHook, ApplicationStopHook {
  private readonly injector = inject(Injector);
  private readonly logger = injectLogger({ optional: false });
  private readonly options = getDefaultOptions(inject<ExpressOptions>(EXPRESS_OPTIONS, {optional: true}));
  
  private app: Application;
  private server?: Server;

  constructor() {
    const app = express();

    if (typeof this.options.set === 'object' && this.options.set !== null) {
      for (const [key, value] of Object.entries(this.options.set)) {
        app.set(key, value);
      }
    }

    const middlewares = this.injector.getAll(EXPRESS_HANDLER, InjectorStrategy.ImportedExported);
    for (const middleware of middlewares) {
      
    }

    this.app = app;
  }

  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }
  

  onApplicationStart() {
    if (this.server !== undefined) return;
    this.logger.debug({ msg: `Started listening on http://${this.options.listen.host}:${this.options.listen.port}/`, port: this.options.listen.port, host: this.options.listen.host})
    this.server = this.app.listen(this.options.listen.port, this.options.listen.host);
  }
  
  async onApplicationStop() {
    this.options.listen.host
    this.logger.debug({
      msg: "Express server requested to stop",
      host: this.options.listen.host,
      port: this.options.listen.port
    });
    if (this.server === undefined) return;
    
    await new Promise<void>((resolve, err) => {
      this.server!.once('close', resolve);
      this.server!.close(err);
    })
  }
}

export function ExpressModule(options?: ExpressOptions & {import: Module[]}): Module {
  return defineModule({
    name: 'ExpressModule',
    import: options?.import ?? [],
    provide: [
      {
        for: EXPRESS_OPTIONS,
        useValue: options
      },
      ExpressServer,
    ],
    export: [ExpressServer],
  })
}