declare module 'mpris-service' {
  interface PlayerOptions {
    name: string;
    identity: string;
    supportedUriSchemes?: string[];
    supportedMimeTypes?: string[];
    supportedInterfaces?: string[];
  }

  interface Player {
    on(event: string, callback: (...args: any[]) => void): void;
    playbackStatus: string;
    metadata: Record<string, any>;
    position: number;
    getPosition: () => number;
    seeked(position: number): void;
    objectPath(path: string): string;
    quit(): void;
  }

  function Player(options: PlayerOptions): Player;
  export = Player;
}
