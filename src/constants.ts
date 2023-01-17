export const CSS_MODULE_EXTENSIONS = [".css", ".scss", ".less"] as const;

export type CssModuleExtensions = typeof CSS_MODULE_EXTENSIONS[number];

export const TS_MODULE_EXTENSIONS = [".tsx", ".ts"];
