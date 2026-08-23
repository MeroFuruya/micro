import { defineModule } from "../../../micro/index.js";
import { BazModule } from "../baz/index.js";
import { Foo1Service } from "./foo1.js";
import { Foo2Service } from "./foo2.js";

export const FooModule = defineModule({
  name: "FooModule",
  import: [BazModule],
  provide: [Foo2Service, Foo1Service],
})