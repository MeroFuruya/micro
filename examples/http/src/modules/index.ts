import { defineModule } from "@micro/core";
import { ExpressModule } from "@micro/express";
import { LoggerModule } from "@micro/logging";
import { MiddlewareModule } from "@micro/middleware";
import { pino } from "pino";
import { BananaModule } from "./banana/index.js";

export const AppModule = defineModule({
  name: "AppModule",
  import: [
    LoggerModule({instance: pino({ level: 'trace'})}),
    ExpressModule({import: [MiddlewareModule([BananaModule])]})
  ],
})