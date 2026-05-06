export const uploadFile = async (file, folder = 'school_uploads') => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration missing. Check your .env.local file.");
    }

    // File size check (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    // Use /auto/upload — Cloudinary auto-detects resource type
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorMsg = "Cloudinary upload failed";
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch (e) { /* ignore parse error */ }
        throw new Error(errorMsg);
    }

    const data = await response.json();

    // For raw files (PDFs, docs etc.), Cloudinary may return an image-type URL
    // that doesn't render properly. Convert to raw delivery URL for documents.
    let url = data.secure_url;
    const ext = file.name?.split('.').pop()?.toLowerCase() || '';
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', 'rtf'];

    if (docExtensions.includes(ext) && url.includes('/image/upload/')) {
        // Replace /image/upload/ with /raw/upload/ so the file is served as-is
        url = url.replace('/image/upload/', '/raw/upload/');
    }

    return url;
};
