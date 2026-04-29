export const LIVE_OBJECT_TYPES = [
  "osc~",
  "phasor~",
  "noise~",
  "*~",
  "+~",
  "-~",
  "/~",
  "hip~",
  "lop~",
  "line~",
  "dac~",
  "metro",
  "random",
  "float",
  "bng",
  "tgl"
] as const;

export type LiveObjectType = (typeof LIVE_OBJECT_TYPES)[number];

export interface LivePatchNode {
  id: string;
  pdIndex: number;
  type: LiveObjectType;
  x: number;
  y: number;
  args: number[];
}

export interface LivePatchConnection {
  id: string;
  sourceId: string;
  outlet: number;
  targetId: string;
  inlet: number;
}

export interface LivePatchSnapshot {
  nodes: LivePatchNode[];
  connections: LivePatchConnection[];
}

export interface AddLiveObjectInput {
  type: LiveObjectType;
  x: number;
  y: number;
  args?: number[];
}

export interface ConnectLiveObjectsInput {
  sourceId: string;
  outlet?: number;
  targetId: string;
  inlet?: number;
}

export interface MoveLiveObjectInput {
  id: string;
  x: number;
  y: number;
}

export interface RemoveLiveObjectInput {
  id: string;
}

export interface DisconnectLiveObjectsInput {
  id: string;
}

export interface UpdateLiveObjectInput {
  id: string;
  type?: LiveObjectType;
  x?: number;
  y?: number;
  args?: number[];
}

export interface ReplaceLiveGraphNodeInput {
  id?: string;
  type: LiveObjectType;
  x: number;
  y: number;
  args?: number[];
}

export interface ReplaceLiveGraphConnectionInput {
  id?: string;
  sourceId: string;
  outlet?: number;
  targetId: string;
  inlet?: number;
}

export interface ReplaceLiveGraphInput {
  nodes: ReplaceLiveGraphNodeInput[];
  connections?: ReplaceLiveGraphConnectionInput[];
}

const DEFAULT_ARGS: Record<LiveObjectType, number[]> = {
  "osc~": [440],
  "phasor~": [110],
  "noise~": [],
  "*~": [0.1],
  "+~": [0],
  "-~": [0],
  "/~": [1],
  "hip~": [3],
  "lop~": [1_000],
  "line~": [],
  "dac~": [1, 2],
  metro: [250],
  random: [8],
  float: [0],
  bng: [],
  tgl: []
};

const MAX_ARGS = 4;

export class LivePatchGraph {
  private nodes: LivePatchNode[] = [];
  private connections: LivePatchConnection[] = [];
  private nextNodeId = 1;
  private nextConnectionId = 1;

  addObject(input: AddLiveObjectInput): { node: LivePatchNode; messages: string[] } {
    const args = normalizeArgs(input.type, input.args);
    const node: LivePatchNode = {
      id: `obj-${this.nextNodeId++}`,
      pdIndex: this.nodes.length,
      type: input.type,
      x: input.x,
      y: input.y,
      args
    };

    this.nodes.push(node);

    return {
      node: cloneNode(node),
      messages: [objectMessage(node)]
    };
  }

  connect(input: ConnectLiveObjectsInput): {
    connection: LivePatchConnection;
    messages: string[];
  } {
    const outlet = input.outlet ?? 0;
    const inlet = input.inlet ?? 0;
    const source = this.requireNode(input.sourceId);
    const target = this.requireNode(input.targetId);

    if (target.type === "dac~" && source.type !== "*~") {
      throw new Error("Route audio through *~ gain before connecting to dac~");
    }

    const connection: LivePatchConnection = {
      id: `conn-${this.nextConnectionId++}`,
      sourceId: source.id,
      outlet,
      targetId: target.id,
      inlet
    };

    this.connections.push(connection);

    return {
      connection: cloneConnection(connection),
      messages: [connectMessage(connection, this.nodes)]
    };
  }

  moveObject(input: MoveLiveObjectInput): { node: LivePatchNode; messages: string[] } {
    const node = this.requireNode(input.id);
    node.x = input.x;
    node.y = input.y;

    return {
      node: cloneNode(node),
      messages: this.rebuildMessages()
    };
  }

  removeObject(input: RemoveLiveObjectInput): {
    object: LivePatchNode;
    messages: string[];
  } {
    const node = this.requireNode(input.id);
    this.nodes = this.nodes.filter((candidate) => candidate.id !== node.id);
    this.connections = this.connections.filter(
      (connection) => connection.sourceId !== node.id && connection.targetId !== node.id
    );
    this.reindexNodes();

    return {
      object: cloneNode(node),
      messages: this.rebuildMessages()
    };
  }

  disconnect(input: DisconnectLiveObjectsInput): {
    connection: LivePatchConnection;
    messages: string[];
  } {
    const connection = this.requireConnection(input.id);
    this.connections = this.connections.filter((candidate) => candidate.id !== connection.id);

    return {
      connection: cloneConnection(connection),
      messages: this.rebuildMessages()
    };
  }

  updateObject(input: UpdateLiveObjectInput): {
    object: LivePatchNode;
    messages: string[];
  } {
    const node = this.requireNode(input.id);
    const previous = cloneNode(node);

    node.type = input.type ?? node.type;
    node.x = input.x ?? node.x;
    node.y = input.y ?? node.y;
    if (input.args !== undefined || input.type !== undefined) {
      node.args = normalizeArgs(node.type, input.args);
    }

    try {
      this.validateConnections(this.connections, this.nodes);
    } catch (error) {
      Object.assign(node, previous);
      throw error;
    }

    return {
      object: cloneNode(node),
      messages: this.rebuildMessages()
    };
  }

  replaceGraph(input: ReplaceLiveGraphInput): {
    livePatch: LivePatchSnapshot;
    messages: string[];
  } {
    const nodes = input.nodes.map((nodeInput, index) => ({
      id: nodeInput.id ?? `obj-${index + 1}`,
      pdIndex: index,
      type: nodeInput.type,
      x: nodeInput.x,
      y: nodeInput.y,
      args: normalizeArgs(nodeInput.type, nodeInput.args)
    }));
    ensureUniqueIds(nodes.map((node) => node.id), "live patch object");

    const connections = (input.connections ?? []).map((connectionInput, index) => ({
      id: connectionInput.id ?? `conn-${index + 1}`,
      sourceId: connectionInput.sourceId,
      outlet: connectionInput.outlet ?? 0,
      targetId: connectionInput.targetId,
      inlet: connectionInput.inlet ?? 0
    }));
    ensureUniqueIds(connections.map((connection) => connection.id), "live patch connection");
    this.validateConnections(connections, nodes);

    this.nodes = nodes;
    this.connections = connections;
    this.nextNodeId = nextNumericId(nodes.map((node) => node.id), "obj");
    this.nextConnectionId = nextNumericId(connections.map((connection) => connection.id), "conn");

    return {
      livePatch: this.snapshot(),
      messages: this.rebuildMessages()
    };
  }

  clear(): { messages: string[] } {
    this.nodes = [];
    this.connections = [];
    this.nextNodeId = 1;
    this.nextConnectionId = 1;

    return { messages: ["clear"] };
  }

  snapshot(): LivePatchSnapshot {
    return {
      nodes: this.nodes.map(cloneNode),
      connections: this.connections.map(cloneConnection)
    };
  }

  rebuildMessages(): string[] {
    return [
      "clear",
      ...this.nodes.map(objectMessage),
      ...this.connections.map((connection) => connectMessage(connection, this.nodes))
    ];
  }

  private requireNode(id: string): LivePatchNode {
    const node = this.nodes.find((candidate) => candidate.id === id);
    if (!node) {
      throw new Error(`Unknown live patch object id: ${id}`);
    }

    return node;
  }

  private requireConnection(id: string): LivePatchConnection {
    const connection = this.connections.find((candidate) => candidate.id === id);
    if (!connection) {
      throw new Error(`Unknown live patch connection id: ${id}`);
    }

    return connection;
  }

  private reindexNodes(): void {
    this.nodes.forEach((node, index) => {
      node.pdIndex = index;
    });
  }

  private validateConnections(
    connections: LivePatchConnection[],
    nodes: LivePatchNode[]
  ): void {
    for (const connection of connections) {
      const source = nodes.find((node) => node.id === connection.sourceId);
      const target = nodes.find((node) => node.id === connection.targetId);
      if (!source || !target) {
        throw new Error(`Cannot connect missing live patch objects for ${connection.id}`);
      }
      if (target.type === "dac~" && source.type !== "*~") {
        throw new Error("Route audio through *~ gain before connecting to dac~");
      }
    }
  }
}

function normalizeArgs(type: LiveObjectType, args: number[] | undefined): number[] {
  const resolved = args ?? DEFAULT_ARGS[type];
  if (resolved.length > MAX_ARGS) {
    throw new Error(`Too many arguments for ${type}`);
  }

  for (const value of resolved) {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid numeric argument for ${type}`);
    }
  }

  return [...resolved];
}

function objectMessage(node: LivePatchNode): string {
  return ["obj", node.x, node.y, node.type, ...node.args].join(" ");
}

function connectMessage(connection: LivePatchConnection, nodes: LivePatchNode[]): string {
  const source = nodes.find((node) => node.id === connection.sourceId);
  const target = nodes.find((node) => node.id === connection.targetId);
  if (!source || !target) {
    throw new Error(`Cannot connect missing live patch objects for ${connection.id}`);
  }

  return `connect ${source.pdIndex} ${connection.outlet} ${target.pdIndex} ${connection.inlet}`;
}

function ensureUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label} id: ${id}`);
    }
    seen.add(id);
  }
}

function nextNumericId(ids: string[], prefix: "obj" | "conn"): number {
  let max = 0;
  for (const id of ids) {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return max + 1;
}

function cloneNode(node: LivePatchNode): LivePatchNode {
  return { ...node, args: [...node.args] };
}

function cloneConnection(connection: LivePatchConnection): LivePatchConnection {
  return { ...connection };
}
