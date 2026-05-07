import { A2AError } from "./errors";

export interface OAuthBearerConfig {
  type: "bearer";
  token: string;
}

export interface OAuthCustomConfig {
  type: "custom";
  getToken: () => Promise<string>;
}

export type OAuthConfig = OAuthBearerConfig | OAuthCustomConfig;

export class A2AAuthError extends A2AError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "A2AAuthError";
  }
}

export function createAuthFetch(
  config: OAuthConfig,
  innerFetch: typeof fetch,
): typeof fetch {
  switch (config.type) {
    case "bearer": {
      const { token } = config;
      return (input, init) =>
        innerFetch(input, {
          ...init,
          headers: { ...Object(init?.headers), Authorization: `Bearer ${token}` },
        });
    }
    case "custom": {
      const { getToken } = config;
      return async (input, init) => {
        const token = await getToken();
        return innerFetch(input, {
          ...init,
          headers: { ...Object(init?.headers), Authorization: `Bearer ${token}` },
        });
      };
    }
  }
}
