import { defineModule } from "@micro/core";
import { FooModule } from "./foo/index.js";
import { HttpModule } from "@micro/http";

export const AppModule = defineModule({
  name: "AppModule",
  import: [
    FooModule,
    HttpModule({
      host: 'localhost',
    })
  ],
})