import { defineModule } from "@micro/core";
import { ExpressModule } from "@micro/express";
import { LoggerModule } from "@micro/logging";
import { pino } from "pino";
import { MiddlewareModule } from "@micro/middleware";
import { BananaModule } from "./banana/index.js";


const pinoInstance = pino({ level: 'trace'});
pinoInstance.info({msg: "Hey!"});

export const AppModule = defineModule({
  name: "AppModule",
  import: [
    LoggerModule({instance: pinoInstance}),
    ExpressModule({import: [MiddlewareModule([BananaModule])]})
  ],
})