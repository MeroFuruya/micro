import { inject, OnApplicationStart, type ApplicationStartHook } from "@micro/core";
import { Baz2Service } from "../baz/baz2.js";
import { Foo1Service } from "./foo1.js";

export class Foo2Service implements ApplicationStartHook {
  private readonly foo1service = inject(Foo1Service);
  private readonly baz2Service = inject(Baz2Service);
  
  async [OnApplicationStart]() {
    console.log("Foo2Service.onApplicationStart")
    this.foo1service.test();
    this.baz2Service.test()
  }
}