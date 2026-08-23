import { defineModule } from "../../micro/index.js";
import { FooModule } from "./foo/index.js";

export const AppModule = defineModule({
  name: "AppModule",
  import: [FooModule],
})