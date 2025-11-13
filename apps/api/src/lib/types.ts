export type CenterTab =
  | { id: string; title: string; kind: "python"; payload: { path: string } }
  | { id: string; title: string; kind: "notebook"; payload: { path: string } };

export type Openable =
  | { kind: "python"; payload: { path: string } }
  | { kind: "notebook"; payload: { path: string } };

export type ModelCard = {
  path: string;
  type: "markdown" | "docx";
};

