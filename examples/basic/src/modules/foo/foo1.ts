import { OnApplicationStart, type ApplicationStartHook } from "@micro/core";

export class Foo1Service implements ApplicationStartHook {
  test() {
    console.log("Foo1Service.test");
  }

  async [OnApplicationStart]() {
    console.log("Foo1Service.onApplicationStart")
  }
}