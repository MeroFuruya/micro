import { inject, OnApplicationStart } from "@micro/core";
import { Baz1Service } from "./baz1.js";

export class Baz2Service {
  private readonly baz1service = inject(Baz1Service);

  [OnApplicationStart]() {
    console.log("Baz2Service.onApplicationStart")
  }

  test() {
    this.baz1service.test();
  }
}