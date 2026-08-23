export interface OnModuleCreate {
  onModuleCreate(): void | Promise<void>
}

export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>
}