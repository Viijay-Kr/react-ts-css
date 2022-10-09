/* eslint-disable no-console */
import { parse } from '@babel/parser';
import traverse, { Scope } from '@babel/traverse';
import { Identifier, ImportDeclaration, StringLiteral } from '@babel/types';

export interface SourceIdentifier {
	identifier: Identifier;
	import: ImportDeclaration
}
export const parseTsx = (content: string, offset: number): Promise<{
	sourceIdentifiers: SourceIdentifier[];
	targetLiteral: StringLiteral;
	targetIdentifier: Identifier;
	completionIdentifier: Identifier;
} | undefined> => {
	const ast = parse(content, {
		sourceType: 'module',
		errorRecovery: true,
		plugins: ['jsx', 'typescript',],
	});
	let targetLiteral: StringLiteral;
	let targetIdentifier: Identifier;
	let completionIdentifier: Identifier;
	const sourceIdentifiers: SourceIdentifier[] = [];
	return new Promise((resolve, reject) => {
		try {
			traverse(ast, {
				ImportDeclaration(path) {
					if (path.node.source.value.endsWith('.scss')) {
						const importNode = path.node;
						const scope = new Scope(path, path.scope);
						scope.traverse(path.node, {
							Identifier(path) {
								sourceIdentifiers.push({
									identifier: path.node,
									import: importNode,
								});
							},
						});
					}
				},
				Identifier(path) {
					if (path.node.start! <= offset && offset <= path.node.end!) {
						completionIdentifier = path.node;
					}
				},
				StringLiteral(path) {
					const sourceIdentifierNames = sourceIdentifiers.map(i => i.identifier.name);
					if (path.node.start! <= offset && offset <= path.node.end!) {
						const parent = path.parent;
						const _this = path.node;
						const scope = new Scope(path.parentPath, path.parentPath.scope);
						scope.traverse(parent, {
							Identifier(path) {
								if (sourceIdentifierNames.includes(path.node.name)) {
									targetLiteral = _this;
									targetIdentifier = path.node;
								}
							}
						});
					}
				},
				exit(path) {
					// eslint-disable-next-line no-console
					if (path.node.type === 'Program') {
						resolve({
							sourceIdentifiers,
							targetIdentifier,
							targetLiteral,
							completionIdentifier,
						});
					}
				}
			});
		} catch (e) {
			reject(e);
		}
	});
};