export interface CLIContext {
  args: string[];
  flags: Record<string, string | boolean>;
  json: boolean;
  quiet: boolean;
}
