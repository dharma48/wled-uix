/** Turn an arbitrary string into a safe filename stem. */
export function sanitizeFilename(name: string): string {
	return (
		name
			.trim()
			.replace(/[^\w.-]+/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_|_$/g, '') || 'scenes'
	);
}

/** Trigger a browser download of `data` serialized as pretty JSON. */
export function downloadJson(filename: string, data: unknown): void {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
