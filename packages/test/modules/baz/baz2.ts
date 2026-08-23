import { inject } from "../../../micro/index.js";
import { Baz1Service } from "./baz1.js";

export class Baz2Service {
  private readonly baz1service = inject(Baz1Service);

  baz2() {
    this.baz1service.baz2();
  }
}