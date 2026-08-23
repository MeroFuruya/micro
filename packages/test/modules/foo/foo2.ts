import { inject, type OnApplicationStart } from "../../../micro/index.js";
import { Baz2Service } from "../baz/baz2.js";
import { Foo1Service } from "./foo1.js";

export class Foo2Service implements OnApplicationStart {
  private readonly foo1service = inject(Foo1Service);
  private readonly baz2Service = inject(Baz2Service);
  
  async onApplicationStart() {
    await this.foo1service.foo1();

    this.baz2Service.baz2();
  }
}