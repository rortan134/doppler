export const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    if ("arrayBuffer" in blob) {
        return blob.arrayBuffer();
    }
    // Safari
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) {
                reject(new Error("Couldn't convert blob to ArrayBuffer"));
                return;
            }
            resolve(event.target.result as ArrayBuffer);
        };
        reader.onerror = () => {
            reject(reader.error as Error);
        };
        reader.readAsArrayBuffer(blob);
    });
};

export const blobToDataURL = async (blob: Blob): Promise<string> =>
    await new Promise((resolve, reject) => {
        if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.onabort = (error) => {
                reject(error);
            };
            reader.readAsDataURL(blob);
        }
    });

export const blobToText = async (blob: Blob): Promise<string> =>
    await new Promise((resolve, reject) => {
        if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.onabort = (error) => {
                reject(error);
            };
            reader.readAsText(blob);
        }
    });
