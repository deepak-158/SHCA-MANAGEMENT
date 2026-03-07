export const uploadFile = async (file) => {
    return new Promise(async (resolve, reject) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error("Cloudinary configuration missing");
            reject(new Error("Cloudinary configuration missing"));
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Cloudinary upload failed");
            }

            const data = await response.json();
            resolve(data.secure_url); // Returns the URL of the uploaded file
        } catch (error) {
            console.error("Upload error:", error);
            reject(error);
        }
    });
};
