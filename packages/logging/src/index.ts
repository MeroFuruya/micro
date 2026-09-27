import { defineModule, inject, Injector, InjectorStrategy } from '@micro/core';

export type Level = "fatal" | "error" | "warn" | "info" | "debug" | "trace";
export interface LogFn {
  (msg: Record<any, any>): void;
}

export interface Logger {
  /**
   * Log at `'fatal'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  fatal: LogFn;
  /**
   * Log at `'error'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  error: LogFn;
  /**
   * Log at `'warn'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  warn: LogFn;
  /**
   * Log at `'info'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  info: LogFn;
  /**
   * Log at `'debug'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  debug: LogFn;
  /**
   * Log at `'trace'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   * If more args follows `msg`, these will be used to format `msg` using `util.format`.
   *
   * @typeParam T: the interface of the object being serialized. Default is object.
   * @param obj: object to be serialized
   * @param msg: the log message to write
   * @param ...args: format string values when `msg` is a format string
   */
  trace: LogFn;
}

export interface ParentLogger extends Logger {
  child(overrideMessage?: Record<any, any>): Logger;
}

export const LOGGER = Symbol("Logger")

export interface LoggerModuleOptions {
  instance: ParentLogger;
}

export function LoggerModule(options: LoggerModuleOptions) {
  return defineModule({
    name: 'PinoModule',
    provide: [
      {
        for: LOGGER,
        useValue: options.instance,
      }
    ],
    export: [LOGGER],
  });
}

export function injectLogger(options?: {optional: boolean}) {
  const injector = inject(Injector);
  const instance = injector.get<ParentLogger>(
    LOGGER,
    {
      strategies: [
        InjectorStrategy.CurrentProvided,
        InjectorStrategy.ImportedExported,
        InjectorStrategy.AnyExported,
      ],
      optional: options?.optional ?? false,
    },
  );
  if (instance === undefined) return new Proxy({}, { get: () => () => undefined}) as Logger;
  
  const moduleName = injector.application.moduleStore.name.get(injector.module);
  return instance.child({ module: moduleName });
}