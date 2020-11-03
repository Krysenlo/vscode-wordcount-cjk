import {
  window,
  Disposable,
  WorkspaceConfiguration,
  workspace,
  OutputChannel,
  ExtensionContext
} from "vscode";

export class DebugOutput {
  private _debugOn!: boolean
  private output?: OutputChannel;
  private context: ExtensionContext;
  private _disposables: Disposable[] = [];

  constructor(context: ExtensionContext) {
    this.context = context;
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("wordcount_cjk")) {
        console.log("wordcount_cjk changed");
        const configuration = workspace.getConfiguration("wordcount_cjk");
        this.getConfig(configuration);
        this.debugOn();
        console.log(
          `onDidChangeConfiguration: debug = ${this._debugOn}`
        );
      }
    }, this, this._disposables);
    this.getConfig(workspace.getConfiguration("wordcount_cjk"))
    this.debugOn();
  }

  private debugOn() {
    if (this._debugOn) {
      if (this.output === undefined) {
        this.output = window.createOutputChannel('wordcount_cjk');
        this.context.subscriptions.push(this.output);
      }
      this.output.show();
    } else {
      this.output?.clear();
      this.output?.hide();
      this.output?.dispose();
      this.output = undefined;
    }
  }
  private getConfig(configuration: WorkspaceConfiguration) {
    this._debugOn = configuration.get<boolean>(
      "debug",
      false
    );
  }

  public appendLine(val: string) { this.output?.appendLine(val); }
  public append(val: string) { this.output?.append(val); }

  dispose() {
    this.output?.dispose();
    Disposable.from(...this._disposables).dispose();
  }
}
