import { inject, type OnApplicationStart } from "@micro/core";
import { Baz2Service } from "../baz/baz2.js";
import { Foo1Service } from "./foo1.js";
import { injectLogger } from "@micro/logging";

export class Foo2Service implements OnApplicationStart {
  private readonly foo1service = inject(Foo1Service);
  private readonly baz2Service = inject(Baz2Service);
  private readonly logger = injectLogger();

  constructor() {
    this.logger.info({msg: "Hey :)"});
  }
  
  async onApplicationStart() {
    console.log("Foo2Service.onApplicationStart")
    this.foo1service.test();
    this.baz2Service.test()
  }
}