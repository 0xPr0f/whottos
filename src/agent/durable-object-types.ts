export interface DurableObjectId {
  toString(): string
}

export interface DurableObjectStub {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>
}

export interface DurableObjectNamespace<
  TStub extends DurableObjectStub = DurableObjectStub,
> {
  idFromName(name: string): DurableObjectId
  newUniqueId(): DurableObjectId
  get(id: DurableObjectId): TStub
}

export interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  setAlarm(scheduledTime: number): Promise<void>
}

export interface DurableObjectState {
  id: DurableObjectId
  storage: DurableObjectStorage
  acceptWebSocket(webSocket: WebSocket, tags?: string[]): void
}
