import { OnApplicationStart } from "@micro/core";

export class Baz1Service {
  [OnApplicationStart]() {
    console.log("Baz1Service.onApplicationStart")
  }

  test() {
    console.log("Baz1Service.test");
  }
}