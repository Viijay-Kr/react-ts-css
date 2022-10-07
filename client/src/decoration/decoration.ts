import { Range, TextEditor, TextEditorDecorationType, window, Position } from 'vscode';

export class Decoration {
	private readonly decorationType: TextEditorDecorationType = window.createTextEditorDecorationType({
		textDecoration: 'underline',
	});
	private readonly noDecoration: TextEditorDecorationType = window.createTextEditorDecorationType({ textDecoration: 'none' });
	private readonly textEditor: TextEditor | undefined = window.activeTextEditor;
	protected prevRange: Range | undefined;

	public addDecoration(start: Position, end: Position) {
		const range = new Range(start, end);
		this.prevRange = range;
		window.activeTextEditor?.setDecorations(this.decorationType, [range]);
	}

	public removeDecoration() {
		this.textEditor?.setDecorations(this.noDecoration, [this.prevRange!]);
	}
}