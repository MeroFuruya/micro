export const OnApplicationStart = Symbol('OnApplicationStart');
export interface ApplicationStartHook {
  [OnApplicationStart](): void | Promise<void>;
}

export const OnApplicationStop = Symbol('OnApplicationStop');
export interface ApplicationStopHook {
  [OnApplicationStop](): void | Promise<void>;
}