//@ts-ignore
export function chunkText(text: string, chunkSize = 800, overlap = 50): string[] {
    const chunks: string[] = []; // this is an output array.
    if (!text) {
        return chunks;
    }

    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end).trim();
        if (chunk) chunks.push(chunk);

        if (end >= text.length) {
            break;
        }

        // see how we are moving start forward but chunks are keep overlapped so that it could be embedded correctly
        start = end - overlap;

        if (start < 0) {
            start = 0;
        }
    }
    return chunks;
}