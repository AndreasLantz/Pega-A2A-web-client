export type Locale = "en" | "es" | "ko";
export const LOCALE_COOKIE = "aiapp.locale";

const en = {
  sidebar: {
    signedIn: "Signed in",
    settings: "Settings",
    signOut: "Sign out",
    tabs: { chat: "Chat", mcp: "MCP" },
  },
  chat: {
    newChat: "+ New chat",
    noConversations: "No conversations yet.",
    empty: "(empty)",
    deleteConversation: "Delete conversation",
    pickAgent: "Pick an agent",
    cancel: "Cancel",
    failedToLoadAgents: (error: string) => `Failed to load agents: ${error}`,
    loadingAgents: "Loading agents…",
    noAgents: "No agents available.",
    details: "Details",
    start: "Start",
    back: "← Back",
    startChat: "Start chat",
    failedToLoadAgentCard: (error: string) => `Failed to load agent card: ${error}`,
    loadingAgentCard: "Loading agent card…",
    version: "Version",
    streaming: "Streaming",
    pushNotifications: "Push notifications",
    inputModes: "Input modes",
    outputModes: "Output modes",
    yes: "Yes",
    no: "No",
    viewDocumentation: "View documentation ↗",
    skills: "Skills",
    tryOne: "Try one",
    sendMessageTo: (agent: string) =>
      `Send a message to start chatting with ${agent}.`,
    stateLabel: (state: string) => `state: ${state}`,
    noResponse: "(no response)",
    cancelled: "Cancelled.",
    failedToSend: "Failed to send",
    placeholder: "Send a message…",
    send: "Send",
    enterToSend: "Enter to send · Shift+Enter for newline",
    clickToRename: "Click to rename",
    context: "context",
  },
  mcp: {
    newCall: "+ New call",
    noCallsYet: "No calls yet. Successful calls appear here.",
    remove: "Remove",
    title: "MCP",
    description:
      "Make a JSON-RPC call to a Pega-hosted MCP server. Paste the server endpoint URL, pick a method, and tweak params.",
    setAppAlias: {
      pre: "Set the",
      bold: "Pega application alias",
      mid: "in",
      settings: "Settings",
      post: "to call MCP servers.",
    },
    serverHandle: "MCP server handle",
    serverHandleHint: "The segment after /mcp/ in the server URL.",
    resolvesTo: "Resolves to",
    method: "Method",
    custom: "custom…",
    params: "Params (JSON)",
    calling: "Calling…",
    call: "Call",
    response: "Response",
    tools: (n: number) => `${n} tool${n === 1 ? "" : "s"}`,
    inputs: "Inputs",
    required: "required",
    optional: "optional",
    noInputs: "No inputs",
    meta: "meta",
  },
  settings: {
    title: "Settings",
    back: "← Back",
    descriptionPre:
      "Connect this app to your Pega instance. Values are saved to",
    descriptionPost:
      "in the project root and override any values set via environment variables.",
    failedToLoad: (error: string) => `Failed to load config: ${error}`,
    requiredFieldsMissing: (fields: string) =>
      `Required fields not yet set: ${fields}`,
    fromSource: (source: string) => `from ${source}`,
    secretSet:
      "A value is set. Click the field to replace it; clear it to remove.",
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    signIn: "Sign in →",
    backToChat: "Back to chat →",
    fields: {
      pegaBaseUrl: {
        label: "Pega base URL",
        placeholder: "https://your-pega-host/prweb",
        hint: "The Pega context root. We append /PRRestService/oauth2/v1/{authorize,token} and /api/agent2agent/v1/agents to it.",
      },
      pegaAppAlias: {
        label: "Pega application alias",
        placeholder: "register-test",
        hint: 'Used for MCP URLs (the path segment after /app/, e.g. "register-test"). Required to use the MCP feature.',
      },
      pegaClientId: {
        label: "Client ID",
        placeholder: "your-oauth-client-id",
        hint: undefined,
      },
      pegaClientSecret: {
        label: "Client secret",
        placeholder: "leave blank for public clients",
        hint: "Only required for confidential OAuth clients. Public clients use PKCE only.",
      },
      pegaRedirectUri: {
        label: "Redirect URI",
        placeholder: "http://localhost:3000/api/auth/callback",
        hint: "Must match exactly what's registered in Pega.",
      },
      pegaScopes: {
        label: "Scopes",
        placeholder: "openid profile",
        hint: "Space-separated. Leave blank if none required.",
      },
    },
  },
  login: {
    title: "Pega Agents Chat",
    subtitle:
      "Sign in with your Pega account to start chatting with agents.",
    signInFailed: "Sign-in failed:",
    notConfiguredPre: "This app isn’t configured yet.",
    notConfiguredLink: "Open settings",
    notConfiguredPost: "to connect your Pega instance.",
    signInButton: "Sign in with Pega",
    settingsLink: "Settings",
  },
};

type Translations = typeof en;

const es: Translations = {
  sidebar: {
    signedIn: "Conectado",
    settings: "Configuración",
    signOut: "Cerrar sesión",
    tabs: { chat: "Chat", mcp: "MCP" },
  },
  chat: {
    newChat: "+ Nuevo chat",
    noConversations: "Aún no hay conversaciones.",
    empty: "(vacío)",
    deleteConversation: "Eliminar conversación",
    pickAgent: "Elige un agente",
    cancel: "Cancelar",
    failedToLoadAgents: (error: string) =>
      `Error al cargar agentes: ${error}`,
    loadingAgents: "Cargando agentes…",
    noAgents: "No hay agentes disponibles.",
    details: "Detalles",
    start: "Iniciar",
    back: "← Atrás",
    startChat: "Iniciar chat",
    failedToLoadAgentCard: (error: string) =>
      `Error al cargar la tarjeta del agente: ${error}`,
    loadingAgentCard: "Cargando tarjeta del agente…",
    version: "Versión",
    streaming: "Transmisión",
    pushNotifications: "Notificaciones push",
    inputModes: "Modos de entrada",
    outputModes: "Modos de salida",
    yes: "Sí",
    no: "No",
    viewDocumentation: "Ver documentación ↗",
    skills: "Habilidades",
    tryOne: "Prueba uno",
    sendMessageTo: (agent: string) =>
      `Envía un mensaje para comenzar a chatear con ${agent}.`,
    stateLabel: (state: string) => `estado: ${state}`,
    noResponse: "(sin respuesta)",
    cancelled: "Cancelado.",
    failedToSend: "Error al enviar",
    placeholder: "Enviar un mensaje…",
    send: "Enviar",
    enterToSend:
      "Enter para enviar · Shift+Enter para nueva línea",
    clickToRename: "Clic para renombrar",
    context: "contexto",
  },
  mcp: {
    newCall: "+ Nueva llamada",
    noCallsYet: "Aún sin llamadas. Las llamadas exitosas aparecen aquí.",
    remove: "Eliminar",
    title: "MCP",
    description:
      "Realiza una llamada JSON-RPC a un servidor MCP alojado en Pega. Pega la URL del endpoint, elige un método y ajusta los parámetros.",
    setAppAlias: {
      pre: "Configura el",
      bold: "alias de aplicación Pega",
      mid: "en",
      settings: "Configuración",
      post: "para llamar a servidores MCP.",
    },
    serverHandle: "Identificador del servidor MCP",
    serverHandleHint:
      "El segmento después de /mcp/ en la URL del servidor.",
    resolvesTo: "Se resuelve a",
    method: "Método",
    custom: "personalizado…",
    params: "Parámetros (JSON)",
    calling: "Llamando…",
    call: "Llamar",
    response: "Respuesta",
    tools: (n: number) => `${n} herramienta${n === 1 ? "" : "s"}`,
    inputs: "Entradas",
    required: "requerido",
    optional: "opcional",
    noInputs: "Sin entradas",
    meta: "meta",
  },
  settings: {
    title: "Configuración",
    back: "← Atrás",
    descriptionPre:
      "Conecta esta aplicación a tu instancia de Pega. Los valores se guardan en",
    descriptionPost:
      "en la raíz del proyecto y anulan cualquier valor establecido mediante variables de entorno.",
    failedToLoad: (error: string) =>
      `Error al cargar configuración: ${error}`,
    requiredFieldsMissing: (fields: string) =>
      `Campos obligatorios no configurados: ${fields}`,
    fromSource: (source: string) => `desde ${source}`,
    secretSet:
      "Hay un valor establecido. Haz clic en el campo para reemplazarlo; bórralo para eliminarlo.",
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado.",
    signIn: "Iniciar sesión →",
    backToChat: "Volver al chat →",
    fields: {
      pegaBaseUrl: {
        label: "URL base de Pega",
        placeholder: "https://tu-host-pega/prweb",
        hint: "La raíz de contexto de Pega. Añadimos /PRRestService/oauth2/v1/{authorize,token} y /api/agent2agent/v1/agents.",
      },
      pegaAppAlias: {
        label: "Alias de la aplicación Pega",
        placeholder: "register-test",
        hint: 'Usado en URLs de MCP (el segmento después de /app/, p. ej. "register-test"). Necesario para usar la función MCP.',
      },
      pegaClientId: {
        label: "ID de cliente",
        placeholder: "tu-id-de-cliente-oauth",
        hint: undefined,
      },
      pegaClientSecret: {
        label: "Secreto de cliente",
        placeholder: "dejar en blanco para clientes públicos",
        hint: "Solo necesario para clientes OAuth confidenciales. Los clientes públicos solo usan PKCE.",
      },
      pegaRedirectUri: {
        label: "URI de redirección",
        placeholder: "http://localhost:3000/api/auth/callback",
        hint: "Debe coincidir exactamente con lo registrado en Pega.",
      },
      pegaScopes: {
        label: "Alcances",
        placeholder: "openid profile",
        hint: "Separados por espacios. Deja en blanco si no se requieren.",
      },
    },
  },
  login: {
    title: "Pega Agents Chat",
    subtitle:
      "Inicia sesión con tu cuenta de Pega para comenzar a chatear con agentes.",
    signInFailed: "Error al iniciar sesión:",
    notConfiguredPre: "Esta aplicación aún no está configurada.",
    notConfiguredLink: "Abre la configuración",
    notConfiguredPost: "para conectar tu instancia de Pega.",
    signInButton: "Iniciar sesión con Pega",
    settingsLink: "Configuración",
  },
};

const ko: Translations = {
  sidebar: {
    signedIn: "로그인됨",
    settings: "설정",
    signOut: "로그아웃",
    tabs: { chat: "채팅", mcp: "MCP" },
  },
  chat: {
    newChat: "+ 새 채팅",
    noConversations: "대화가 없습니다.",
    empty: "(비어 있음)",
    deleteConversation: "대화 삭제",
    pickAgent: "에이전트 선택",
    cancel: "취소",
    failedToLoadAgents: (error: string) => `에이전트 로드 실패: ${error}`,
    loadingAgents: "에이전트 불러오는 중…",
    noAgents: "사용 가능한 에이전트가 없습니다.",
    details: "세부 정보",
    start: "시작",
    back: "← 뒤로",
    startChat: "채팅 시작",
    failedToLoadAgentCard: (error: string) =>
      `에이전트 카드 로드 실패: ${error}`,
    loadingAgentCard: "에이전트 카드 불러오는 중…",
    version: "버전",
    streaming: "스트리밍",
    pushNotifications: "푸시 알림",
    inputModes: "입력 모드",
    outputModes: "출력 모드",
    yes: "예",
    no: "아니오",
    viewDocumentation: "문서 보기 ↗",
    skills: "기술",
    tryOne: "시도해보기",
    sendMessageTo: (agent: string) =>
      `${agent}와(과) 채팅을 시작하려면 메시지를 보내세요.`,
    stateLabel: (state: string) => `상태: ${state}`,
    noResponse: "(응답 없음)",
    cancelled: "취소됨.",
    failedToSend: "전송 실패",
    placeholder: "메시지를 입력하세요…",
    send: "전송",
    enterToSend: "Enter로 전송 · Shift+Enter로 줄바꿈",
    clickToRename: "클릭하여 이름 변경",
    context: "컨텍스트",
  },
  mcp: {
    newCall: "+ 새 호출",
    noCallsYet: "아직 호출이 없습니다. 성공한 호출이 여기에 표시됩니다.",
    remove: "삭제",
    title: "MCP",
    description:
      "Pega에서 호스팅하는 MCP 서버에 JSON-RPC 호출을 수행합니다. 서버 엔드포인트 URL을 붙여넣고 메서드를 선택한 후 파라미터를 조정하세요.",
    setAppAlias: {
      pre: "",
      bold: "Pega 애플리케이션 별칭",
      mid: "을",
      settings: "설정",
      post: "에서 구성하면 MCP 서버를 호출할 수 있습니다.",
    },
    serverHandle: "MCP 서버 핸들",
    serverHandleHint: "/mcp/ 이후의 서버 URL 세그먼트입니다.",
    resolvesTo: "다음으로 변환됩니다",
    method: "메서드",
    custom: "직접 입력…",
    params: "파라미터 (JSON)",
    calling: "호출 중…",
    call: "호출",
    response: "응답",
    tools: (n: number) => `도구 ${n}개`,
    inputs: "입력",
    required: "필수",
    optional: "선택",
    noInputs: "입력 없음",
    meta: "메타",
  },
  settings: {
    title: "설정",
    back: "← 뒤로",
    descriptionPre:
      "이 앱을 Pega 인스턴스에 연결합니다. 값은",
    descriptionPost:
      "에 저장되며 환경 변수로 설정된 값을 재정의합니다.",
    failedToLoad: (error: string) => `설정 로드 실패: ${error}`,
    requiredFieldsMissing: (fields: string) =>
      `필수 필드가 설정되지 않았습니다: ${fields}`,
    fromSource: (source: string) => `${source}에서`,
    secretSet:
      "값이 설정되어 있습니다. 필드를 클릭하여 교체하거나, 지워서 삭제하세요.",
    save: "저장",
    saving: "저장 중…",
    saved: "저장됨.",
    signIn: "로그인 →",
    backToChat: "채팅으로 돌아가기 →",
    fields: {
      pegaBaseUrl: {
        label: "Pega 기본 URL",
        placeholder: "https://your-pega-host/prweb",
        hint: "Pega 컨텍스트 루트입니다. /PRRestService/oauth2/v1/{authorize,token} 및 /api/agent2agent/v1/agents가 추가됩니다.",
      },
      pegaAppAlias: {
        label: "Pega 애플리케이션 별칭",
        placeholder: "register-test",
        hint: 'MCP URL에 사용됩니다 (/app/ 이후 경로 세그먼트, 예: "register-test"). MCP 기능 사용에 필요합니다.',
      },
      pegaClientId: {
        label: "클라이언트 ID",
        placeholder: "your-oauth-client-id",
        hint: undefined,
      },
      pegaClientSecret: {
        label: "클라이언트 시크릿",
        placeholder: "공개 클라이언트는 비워두세요",
        hint: "기밀 OAuth 클라이언트에만 필요합니다. 공개 클라이언트는 PKCE만 사용합니다.",
      },
      pegaRedirectUri: {
        label: "리다이렉트 URI",
        placeholder: "http://localhost:3000/api/auth/callback",
        hint: "Pega에 등록된 값과 정확히 일치해야 합니다.",
      },
      pegaScopes: {
        label: "스코프",
        placeholder: "openid profile",
        hint: "공백으로 구분합니다. 필요 없으면 비워두세요.",
      },
    },
  },
  login: {
    title: "Pega Agents Chat",
    subtitle:
      "Pega 계정으로 로그인하여 에이전트와 채팅을 시작하세요.",
    signInFailed: "로그인 실패:",
    notConfiguredPre: "앱이 아직 구성되지 않았습니다.",
    notConfiguredLink: "설정 열기",
    notConfiguredPost: "에서 Pega 인스턴스를 연결하세요.",
    signInButton: "Pega로 로그인",
    settingsLink: "설정",
  },
};

export const translations: Record<Locale, Translations> = { en, es, ko };

export function getT(locale: Locale): Translations {
  return translations[locale];
}

export function getLocale(cookieValue: string | undefined): Locale {
  if (cookieValue === "en" || cookieValue === "es" || cookieValue === "ko")
    return cookieValue;
  return "en";
}
