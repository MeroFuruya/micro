import type { OnApplicationStart } from "../../../micro/index.js";

export class Foo1Service implements OnApplicationStart {
  test() {
    console.log("Foo1Service.test");
  }

  async onApplicationStart() {
    console.log("Foo1Service.onApplicationStart")
  }
}