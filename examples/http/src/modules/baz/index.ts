import { defineModule } from "@micro/core";
import { Baz1Service } from "./baz1.js";
import { Baz2Service } from "./baz2.js";

export const BazModule = defineModule({
  name: "BazModule",
  provide: [Baz1Service, Baz2Service],
  export: [Baz2Service],
})

export {
  Baz1Service,
  Baz2Service,
}