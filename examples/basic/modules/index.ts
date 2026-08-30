import { defineModule } from "@micro/core";
import { FooModule } from "./foo/index.js";

export const AppModule = defineModule({
  name: "AppModule",
  import: [FooModule],
})