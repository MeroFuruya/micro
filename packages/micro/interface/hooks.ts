export interface OnApplicationStart {
  onApplicationStart(): void | Promise<void>
}

export interface OnApplicationStop {
  onApplicationStop(): void | Promise<void>
}

export type AsyncHookName = keyof (
  OnApplicationStart & OnApplicationStop
)