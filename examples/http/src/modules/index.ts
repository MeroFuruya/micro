import { defineModule } from "@micro/core";
import { ExpressModule } from "@micro/express";
import { LoggerModule } from "@micro/logging";
import { FooModule } from "./foo/index.js";
import { pino } from "pino";


const pinoInstance = pino({ level: 'trace'});
pinoInstance.info({msg: "Hey!"});

export const AppModule = defineModule({
  name: "AppModule",
  import: [
    LoggerModule({instance: pinoInstance}),
    FooModule,
    ExpressModule({import: []})
  ],
})