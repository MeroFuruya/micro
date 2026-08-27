import { inject, type OnApplicationStart } from "../../../micro/index.js";
import { Baz1Service } from "./baz1.js";

export class Baz2Service implements OnApplicationStart {
  private readonly baz1service = inject(Baz1Service);

  onApplicationStart() {
    console.log("Baz2Service.onApplicationStart")
  }

  test() {
    this.baz1service.test();
  }
}