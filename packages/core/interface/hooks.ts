export interface OnApplicationStart {
  onApplicationStart(): void | Promise<void>
}

export interface OnApplicationStop {
  onApplicationStop(): void | Promise<void>
}