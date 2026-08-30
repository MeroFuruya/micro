import type { OnApplicationStart, OnApplicationStop } from "@micro/core";

export class HttpExpressAdapter implements OnApplicationStart, OnApplicationStop {
  private readonly expressApp = {};
  
  async onApplicationStart() {}
  async onApplicationStop() {}
}